import { RequestIntent, RequestStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';

export const requestService = {
  async create(
    senderId: string,
    data: { receiverId: string; message: string; intent: RequestIntent }
  ) {
    if (senderId === data.receiverId) {
      throw new AppError('Cannot send request to yourself', 400);
    }

    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, role: true },
      }),
      prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { id: true, role: true },
      }),
    ]);

    if (!sender || !receiver) throw new AppError('User not found', 404);

    if (sender.role === receiver.role) {
      throw new AppError(
        'Connection requests can only be sent between a founder and an investor',
        400
      );
    }

    const reversePending = await prisma.connectionRequest.findFirst({
      where: {
        senderId: data.receiverId,
        receiverId: senderId,
        status: 'PENDING',
      },
    });
    if (reversePending) {
      throw new AppError(
        'This user has already sent you a request. Check your incoming requests.',
        409
      );
    }

    const existing = await prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId: data.receiverId,
        },
      },
    });
    if (existing) {
      throw new AppError('Request already sent to this user', 409);
    }

    const request = await prisma.connectionRequest.create({
      data: {
        senderId,
        receiverId: data.receiverId,
        message: data.message,
        intent: data.intent,
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePicture: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, profilePicture: true, role: true },
        },
      },
    });

    void logActivity(senderId, 'REQUEST_SENT', { requestId: request.id }).catch(() => {});
    void notificationService
      .create(
        data.receiverId,
        'CONNECTION_REQUEST',
        'New connection request',
        `${request.sender.name} sent you a ${data.intent.toLowerCase()} request`,
        { requestId: request.id, senderId }
      )
      .catch(() => {});

    return request;
  },

  async respond(requestId: string, receiverId: string, status: 'ACCEPTED' | 'REJECTED') {
    const request = await prisma.connectionRequest.findFirst({
      where: { id: requestId, receiverId },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    if (!request) throw new AppError('Request not found', 404);
    if (request.status !== 'PENDING') {
      throw new AppError('Request already responded', 400);
    }

    const updated = await prisma.connectionRequest.update({
      where: { id: requestId },
      data: {
        status: status as RequestStatus,
        respondedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePicture: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, profilePicture: true, role: true },
        },
      },
    });

    void logActivity(receiverId, `REQUEST_${status}`, { requestId }).catch(() => {});
    void Promise.all([
      trustScoreService.recalculate(receiverId, `Request ${status.toLowerCase()}`),
      trustScoreService.recalculate(request.senderId, `Request ${status.toLowerCase()}`),
    ]).catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    const notifType = status === 'ACCEPTED' ? 'REQUEST_ACCEPTED' : 'REQUEST_REJECTED';
    void notificationService
      .create(
        request.senderId,
        notifType,
        status === 'ACCEPTED' ? 'Request accepted' : 'Request declined',
        `${request.receiver.name} ${status === 'ACCEPTED' ? 'accepted' : 'declined'} your connection request`,
        { requestId }
      )
      .catch(() => {});

    return updated;
  },

  async getSent(userId: string, limit = 100) {
    return prisma.connectionRequest.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        receiver: {
          select: { id: true, name: true, profilePicture: true, role: true, trustScore: true },
        },
      },
    });
  },

  async getReceived(userId: string, limit = 100) {
    return prisma.connectionRequest.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, name: true, profilePicture: true, role: true, trustScore: true },
        },
      },
    });
  },

  async hasAcceptedConnection(userId1: string, userId2: string): Promise<boolean> {
    const connection = await prisma.connectionRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });
    return Boolean(connection);
  },
};
