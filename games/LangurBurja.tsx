
import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types';

// Custom SVG components for Spade and Club to ensure they match the requested shape
const SpadeSvg = ({ className }: { className: string }) => (
  <svg viewBox="0 0 32 32" className={`${className} w-8 h-8`}>
    <path 
      d="M16 2C13 8 4 14 4 21C4 26 8 28 12 28C13 28 14 27.5 15 27L14 30H18L17 27C18 27.5 19 28 20 28C24 28 28 26 28 21C28 14 19 8 16 2Z" 
      fill="black" 
      stroke="white" 
      strokeWidth="1.5"
    />
  </svg>
);

const ClubSvg = ({ className }: { className: string }) => (
  <svg viewBox="0 0 32 32" className={`${className} w-8 h-8`}>
    <path 
      d="M16 4C18.2091 4 20 5.79086 20 8C20 9.24225 19.4345 10.3524 18.5414 11.0858C20.5925 11.2678 22.1866 12.8791 22.1866 14.8696C22.1866 16.9408 20.4074 18.6217 18.2133 18.6217C17.6534 18.6217 17.1219 18.5135 16.6385 18.3188L17.5 22H14.5L15.3615 18.3188C14.8781 18.5135 14.3466 18.6217 13.7867 18.6217C11.5926 18.6217 9.81335 16.9408 9.81335 14.8696C9.81335 12.8791 11.4075 11.2678 13.4586 11.0858C12.5655 10.3524 12 9.24225 12 8C12 5.79086 13.7909 4 16 4Z" 
      fill="black" 
      stroke="white" 
      strokeWidth="1.5"
      transform="scale(1.2) translate(-2.5, -2)"
    />
  </svg>
);

const SYMBOLS = [
  { id: 'heart', icon: 'fa-heart', color: 'text-red-500', isSvg: false },
  { id: 'spade', icon: null, color: '', isSvg: true, Svg: SpadeSvg },
  { id: 'diamond', icon: 'fa-diamond', color: 'text-red-500', isSvg: false },
  { id: 'club', icon: null, color: '', isSvg: true, Svg: ClubSvg },
  { id: 'flag', icon: 'fa-flag', color: 'text-blue-500', isSvg: false },
  { id: 'crown', icon: 'fa-crown', color: 'text-amber-400', isSvg: false }
];

const BET_VALUES = [1, 5, 10, 50, 100];

interface LangurBurjaProps {
  onGameOver: () => void;
  onBalanceChange: (amount: number, type: Transaction['type']) => void;
  currentBalance: number;
}

const playDiceSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

const Dice: React.FC<{ symbolId: string | null; rolling: boolean }> = ({ symbolId, rolling }) => {
  const [displaySymbol, setDisplaySymbol] = useState<string | null>(symbolId);

  useEffect(() => {
    let interval: number;
    if (rolling) {
      interval = window.setInterval(() => {
        const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;
        setDisplaySymbol(randomSymbol);
      }, 80);
    } else {
      setDisplaySymbol(symbolId);
    }
    return () => clearInterval(interval);
  }, [rolling, symbolId]);

  const current = SYMBOLS.find(s => s.id === displaySymbol) || SYMBOLS[0];

  return (
    <div 
      className={`
        w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border-2 shadow-lg transition-all duration-200
        ${rolling ? 'animate-bounce border-indigo-500 scale-110 shadow-indigo-500/20' : 'border-slate-700'}
      `}
    >
      {current.isSvg ? (
        <current.Svg className={rolling ? 'opacity-50 blur-[1px]' : ''} />
      ) : (
        <i className={`fa-solid ${current.icon} ${current.color} ${rolling ? 'opacity-50 blur-[1px]' : 'text-xl'}`}></i>
      )}
    </div>
  );
};

const LangurBurja: React.FC<LangurBurjaProps> = ({ onGameOver, onBalanceChange, currentBalance }) => {
  const [bets, setBets] = useState<{ [key: string]: number }>({});
  const [selectedBetValue, setSelectedBetValue] = useState<number>(10);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<string[]>(['heart', 'spade', 'diamond', 'club', 'flag', 'crown']);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const soundTimerRef = useRef<number | null>(null);

  const placeBet = (id: string) => {
    if (currentBalance < selectedBetValue) {
      alert("Insufficient funds to place this bet!");
      return;
    }
    setBets(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + selectedBetValue
    }));
    onBalanceChange(-selectedBetValue, 'GAME_ENTRY');
  };

  const rollDice = () => {
    const totalBet = (Object.values(bets) as number[]).reduce((a, b) => a + b, 0);
    if (totalBet === 0) return;

    setIsRolling(true);
    setLastWin(null);

    soundTimerRef.current = window.setInterval(playDiceSound, 150);

    setTimeout(() => {
      if (soundTimerRef.current) clearInterval(soundTimerRef.current);
      
      const newResult = Array.from({ length: 6 }).map(() => 
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id
      );
      
      setResult(newResult);
      setIsRolling(false);

      let winAmount = 0;
      (Object.entries(bets) as [string, number][]).forEach(([symbol, amount]) => {
        const matches = newResult.filter(r => r === symbol).length;
        
        /**
         * Win Logic Update per request: 
         * 1. Ignore single matches (matches < 2 is a loss).
         * 2. For 2+ matches, payout = amount * matches.
         * Example: 3 hearts = 3x total payout (original bet is consumed, then winnings paid back).
         */
        if (matches >= 2) {
          winAmount += amount * matches;
        }
      });

      if (winAmount > 0) {
        onBalanceChange(winAmount, 'GAME_WIN');
        setLastWin(winAmount);
      } else {
        setLastWin(0);
      }
      setBets({});
    }, 1800);
  };

  const resetBets = () => {
    const totalBet = (Object.values(bets) as number[]).reduce((a, b) => a + b, 0);
    if (totalBet > 0) {
      onBalanceChange(totalBet, 'GAME_WIN');
    }
    setBets({});
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest">Langur Burja</h2>
        <div className="flex justify-center items-center gap-2 mt-1">
          <p className="text-slate-500 text-xs font-bold uppercase">Balance:</p>
          <span className="text-green-500 font-black text-sm">${currentBalance.toLocaleString()}</span>
        </div>
        <p className="text-[9px] text-indigo-400 font-bold mt-1 uppercase tracking-tighter">
          * LOSS ON SINGLE MATCH. WIN X-MULTIPLIER ON 2+ MATCHES!
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-inner relative overflow-hidden">
        <div className="flex flex-wrap justify-center gap-3">
          {result.map((symbol, i) => (
            <Dice 
              key={i} 
              symbolId={isRolling ? null : symbol} 
              rolling={isRolling} 
            />
          ))}
        </div>
        <div className="mt-4 text-center h-6">
          {lastWin !== null && !isRolling && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              <p className={`text-lg font-bold ${lastWin > 0 ? 'text-green-500' : 'text-slate-500'}`}>
                {lastWin > 0 ? `WIN +$${lastWin}!` : "NO LUCK!"}
              </p>
            </div>
          )}
          {isRolling && <p className="text-indigo-400 text-xs font-bold animate-pulse">SHAKING ALL 6 DICES...</p>}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase font-black text-center tracking-widest">Set Wager ($)</p>
        <div className="flex justify-center gap-2">
          {BET_VALUES.map(val => (
            <button
              key={val}
              onClick={() => setSelectedBetValue(val)}
              className={`
                w-12 h-12 rounded-full border-2 font-black text-[10px] transition-all
                flex items-center justify-center shadow-lg
                ${selectedBetValue === val 
                  ? 'bg-indigo-600 border-white text-white scale-110' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-400'}
              `}
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-3xl p-4 grid grid-cols-3 gap-3 border border-slate-700">
        {SYMBOLS.map((s) => (
          <button 
            key={s.id} 
            onClick={() => placeBet(s.id)}
            disabled={isRolling}
            className={`
              relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95
              ${bets[s.id] ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-900 border-slate-700'}
            `}
          >
            {s.isSvg ? (
              <s.Svg className="mb-1" />
            ) : (
              <i className={`fa-solid ${s.icon} text-3xl ${s.color}`}></i>
            )}
            <span className="text-[10px] uppercase font-bold text-slate-500 mt-1">{s.id}</span>
            {bets[s.id] && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-900">
                ${bets[s.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button 
            onClick={resetBets}
            disabled={isRolling}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold text-slate-400 border border-slate-700 transition-colors"
          >
            Clear / Refund
          </button>
          <button 
            onClick={rollDice}
            disabled={isRolling || Object.keys(bets).length === 0}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-2xl font-black text-xl shadow-xl shadow-indigo-600/30 transition-all active:translate-y-1"
          >
            {isRolling ? 'ROLLING...' : 'SHAKE DICES'}
          </button>
        </div>
        
        <button 
          onClick={onGameOver}
          className="w-full py-2 text-slate-600 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default LangurBurja;
