
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { CORS_ORIGIN } from '../config/env';

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on('joinMatch', (matchId: string) => {
      const room = `match:${matchId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on('leaveMatch', (matchId: string) => {
      const room = `match:${matchId}`;
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected', socket.id);
    });
  });
}

export function emitMatchEvent(matchId: string, event: 'matchUpdated' | 'scoreUpdated' | 'overUpdated', payload: any) {
  if (!io) return;
  const room = `match:${matchId}`;
  io.to(room).emit(event, payload);
}
