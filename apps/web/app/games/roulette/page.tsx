'use client';

import { useEffect, useState, useRef } from 'react';
import RouletteWheel from '@/components/RouletteWheel';
import BettingArea from '@/components/BettingArea';
import { placeBet, spinWheel, getCurrentGame } from '@/lib/roulete-actions';
import { RouletteGameWithBets, BetType } from '@/types/roulette';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/home/Navbar';

// ✅ Proper type for result bets
type GameResultBet = {
  id: string;
  payout?: number;
};

const RouletteGame = ({ initialGame }: { initialGame: RouletteGameWithBets }) => {
  const [game, setGame] = useState(initialGame);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedBet, setSelectedBet] = useState<{
    type: BetType;
    numbers: number[];
  }>({
    type: 'STRAIGHT',
    numbers: []
  });
  const [isSpinning, setIsSpinning] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const gameIdRef = useRef<string | null>(initialGame?.id ?? null);

  // ✅ WebSocket setup (safe)
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (!wsUrl) {
      console.error('WebSocket URL not defined');
      return;
    }

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');

      ws.send(
        JSON.stringify({
          action: 'join-game',
          gameId: gameIdRef.current
        })
      );
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

          ws.send(
            JSON.stringify({
              action: 'join-game',
              gameId: data.data.id
            })
          );
          break;

        case 'BET_PLACED':
          setGame((prev) => ({
            ...prev,
            bets: [...prev.bets, data.data]
          }));
          break;

        case 'SPIN_STARTED':
          setGame((prev) => ({
            ...prev,
            status: 'SPINNING'
          }));
          setIsSpinning(true);
          break;

        case 'GAME_RESULT':
          setGame((prev) => ({
            ...prev,
            status: 'COMPLETED',
            result: data.data.result,
            bets: prev.bets.map((bet) => ({
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

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Handle new game
  useEffect(() => {
    if (!game) return;

    if (game.status === 'COMPLETED') {
      const timer = setTimeout(async () => {
        try {
          const newGame = await getCurrentGame();

          gameIdRef.current = newGame.id;
          setGame(newGame);
          setIsSpinning(false);

          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                action: 'join-game',
                gameId: newGame.id
              })
            );
          }
        } catch {
          toast.error('Failed to start new game');
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [game?.status]);

  // ✅ Place bet
  const handlePlaceBet = async () => {
    if (selectedBet.numbers.length === 0) {
      toast.error('Please select a bet first');
      return;
    }

    try {
      await placeBet(game.id, selectedBet.type, selectedBet.numbers, betAmount);

      toast.success('Bet placed!');

      setSelectedBet((prev) => ({
        type: prev.type,
        numbers: []
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to place bet');
      }
    }
  };

  // ✅ Spin wheel
  const handleSpin = async () => {
    if (!game) {
      toast.error('Game not initialized.');
      return;
    }

    if (game.status !== 'WAITING') {
      toast.error('Cannot spin wheel at this time.');
      return;
    }

    if (game.bets.length === 0) {
      toast.error('Please place at least one bet before spinning.');
      return;
    }

    try {
      setIsSpinning(true);
      await spinWheel(game.id);
      toast.success('Wheel spinning!');
    } catch (error: unknown) {
      setIsSpinning(false);

      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to start spin');
      }
    }
  };

  const isSpinDisabled =
    game?.status !== 'WAITING' || game?.bets.length === 0 || isSpinning;

  return (
    <div className="min-h-screen bg-gray-900 text-white py-10">
      <Navbar />

      <div className="container mx-auto px-4 py-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-screen">
          
          {/* LEFT SIDE */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-center mb-6 text-red-400">
                Roulette Wheel
              </h2>

              <div className="flex justify-center items-center mb-6">
                <RouletteWheel
                  isSpinning={isSpinning || game?.status === 'SPINNING'}
                  result={game?.result}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSpin}
                  disabled={isSpinDisabled}
                  className={`px-8 py-4 rounded-full ${
                    isSpinDisabled
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-red-500 hover:scale-105'
                  }`}
                >
                  {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-7 space-y-6">
            <BettingArea
              selectedBet={selectedBet}
              onSelectBet={(bet) => setSelectedBet(bet)}
              onPlaceBet={handlePlaceBet}
              betAmount={betAmount}
              onBetAmountChange={setBetAmount}
              disabled={game?.status !== 'WAITING'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouletteGame;