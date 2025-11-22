
'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useMatchSocket(matchId: string, handlers: {
  onScoreUpdated?: (payload: any) => void;
  onOverUpdated?: (payload: any) => void;
  onMatchUpdated?: (payload: any) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const socket = io(process.env.NEXT_PUBLIC_WS_URL as string, {
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.emit('joinMatch', matchId);

    socket.on('scoreUpdated', (payload) => {
      if (payload.matchId === matchId) handlers.onScoreUpdated?.(payload);
    });
    socket.on('overUpdated', (payload) => {
      if (payload.matchId === matchId) handlers.onOverUpdated?.(payload);
    });
    socket.on('matchUpdated', (payload) => {
      if (payload.matchId === matchId) handlers.onMatchUpdated?.(payload);
    });

    return () => {
      socket.emit('leaveMatch', matchId);
      socket.disconnect();
    };
  }, [matchId]);
}
