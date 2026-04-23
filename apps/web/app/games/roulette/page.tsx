'use client';

import { useEffect, useRef } from 'react';
import { RouletteGameWithBets } from '@/types/roulette';

const RouletteGame = ({ initialGame }: { initialGame: RouletteGameWithBets }) => {

  const socketRef = useRef<WebSocket | null>(null);
  const gameIdRef = useRef<string | null>(initialGame?.id ?? null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'join-game',
        gameId: gameIdRef.current
      }));
    };

    return () => ws.close();
  }, []);

  return <div>Roulette Game Running...</div>;
};

export default RouletteGame;