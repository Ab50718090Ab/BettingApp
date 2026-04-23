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

        ws.send(JSON.stringify({
          action: 'join-game',
          gameId: data.data.id
        }));
        break;

      case 'BET_PLACED':
        setGame(prev => ({
          ...prev,
          bets: [...prev.bets, data.data]
        }));
        break;

      case 'SPIN_STARTED':
        setGame(prev => ({
          ...prev,
          status: 'SPINNING'
        }));
        setIsSpinning(true);
        break;

      case 'GAME_RESULT':
        setGame(prev => ({
          ...prev,
          status: 'COMPLETED',
          result: data.data.result,
          bets: prev.bets.map(bet => ({
            ...bet,
            payout: data.data.bets.find(
              (b: GameResultBet) => b.id === bet.id
            )?.payout
          }))
        }));
        setIsSpinning(false);
        break;
    }
  };

  return () => {
    ws.close();
  };

}, []); // ✅ keep empty (no warning now)