import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../types';
import { messageService } from '../services/message.service';
import { requestService } from '../services/request.service';

let io: Server;

export const initSockets = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthPayload;
    socket.join(`user:${user.userId}`);

    socket.on('typing:start', async ({ receiverId }: { receiverId: string }) => {
      const connected = await requestService.hasAcceptedConnection(
        user.userId,
        receiverId
      );
      if (connected) {
        io.to(`user:${receiverId}`).emit('typing:start', { userId: user.userId });
      }
    });

    socket.on('typing:stop', ({ receiverId }: { receiverId: string }) => {
      io.to(`user:${receiverId}`).emit('typing:stop', { userId: user.userId });
    });

    socket.on(
      'message:send',
      async (
        { receiverId, content }: { receiverId: string; content: string },
        callback?: (err: Error | null, message?: unknown) => void
      ) => {
        try {
          const message = await messageService.send(user.userId, receiverId, content);
          callback?.(null, message);
        } catch (err) {
          callback?.(err as Error);
        }
      }
    );

    socket.on('disconnect', () => {
      socket.leave(`user:${user.userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
