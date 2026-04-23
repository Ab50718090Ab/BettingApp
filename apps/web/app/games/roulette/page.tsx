'use client';

import { useEffect, useRef, useState } from 'react';

const RouletteGame = ({ initialGame }: any) => {

  const [game, setGame] = useState(initialGame);
  const [isSpinning, setIsSpinning] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const gameIdRef = useRef<string | null>(initialGame?.id ?? null);

  // ✅ এখানে useEffect থাকবে (INSIDE component)
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (!wsUrl) {
      console.error('WebSocket URL not defined');
      return;
    }

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'join-game',
        gameId: gameIdRef.current
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.event) {
        case 'GAME_UPDATED':
          if (data.data.id === gameIdRef.current) {
            setGame(data.data);
          }
          break;

        case 'NEW_GAME_STARTED':
          gameIdRef.current = data.data.id;
          setGame(data.data);
          setIsSpinning(false);
          break;
      }
    };

    return () => {
      ws.close();
    };

  }, []); // ✅ valid

  return (
    <div>Game Page</div>
  );
};

export default RouletteGame;