import { prisma } from '../config/database';
import { requestService } from './request.service';
import { notificationService } from './notification.service';
import { logActivity } from './activity.service';
import { getIO } from '../sockets';
import { AppError } from '../middleware/errorHandler';

export const messageService = {
  async send(senderId: string, receiverId: string, content: string) {
    const connected = await requestService.hasAcceptedConnection(senderId, receiverId);
    if (!connected) {
      throw new AppError('Messaging requires an accepted connection', 403);
    }

    const message = await prisma.message.create({
      data: { senderId, receiverId, content },
      include: {
        sender: {
          select: { id: true, name: true, profilePicture: true },
        },
        receiver: {
          select: { id: true, name: true, profilePicture: true },
        },
      },
    });

    void logActivity(senderId, 'MESSAGE_SENT', { receiverId }).catch(() => {});
    void notificationService
      .create(
        receiverId,
        'NEW_MESSAGE',
        'New message',
        `${message.sender.name} sent you a message`,
        { messageId: message.id, senderId }
      )
      .catch(() => {});

    try {
      const io = getIO();
      io.to(`user:${receiverId}`).emit('message:new', message);
    } catch {
      // Socket not ready
    }

    return message;
  },

  async getConversation(userId: string, otherUserId: string, page = 1, limit = 50) {
    const connected = await requestService.hasAcceptedConnection(userId, otherUserId);
    if (!connected) {
      throw new AppError('Messaging requires an accepted connection', 403);
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, profilePicture: true },
          },
        },
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
      }),
    ]);

    void prisma.message
      .updateMany({
        where: { senderId: otherUserId, receiverId: userId, read: false },
        data: { read: true },
      })
      .catch(() => {});

    return { messages, total, page, limit };
  },

  async getConversations(userId: string) {
    const [messages, unreadCounts] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          sender: {
            select: { id: true, name: true, profilePicture: true },
          },
          receiver: {
            select: { id: true, name: true, profilePicture: true },
          },
        },
      }),
      prisma.message.groupBy({
        by: ['senderId'],
        where: { receiverId: userId, read: false },
        _count: { _all: true },
      }),
    ]);

    const unreadMap = new Map(
      unreadCounts.map((row) => [row.senderId, row._count._all])
    );

    const conversationMap = new Map<
      string,
      {
        partner: { id: string; name: string; profilePicture: string | null };
        lastMessage: (typeof messages)[0];
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (conversationMap.has(partnerId)) continue;

      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      conversationMap.set(partnerId, {
        partner,
        lastMessage: msg,
        unreadCount: unreadMap.get(partnerId) ?? 0,
      });
    }

    return Array.from(conversationMap.values());
  },
};
