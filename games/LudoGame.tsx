
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundService } from '../services/soundService';

type Color = 'red' | 'green' | 'yellow' | 'blue';
type GameMode = 'local' | 'computer';

interface Piece {
  id: string;
  color: Color;
  pos: number; // -1: base, 0-51: track, 52-56: home stretch, 57: finished
}

interface LudoGameProps {
  onGameOver: (tokensEarned: number) => void;
  entryFee: number;
}

const COLORS: Record<Color, string> = {
  red: '#FF3B30',    // Vibrant Red
  green: '#34C759',  // Emerald Green
  yellow: '#FFCC00', // Amber Yellow
  blue: '#007AFF'    // Royal Blue
};

// Standard Ludo Path (52 steps around the board)
const BOARD_PATH: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], 
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6]
];

const START_OFFSETS: Record<Color, number> = {
  red: 0, green: 13, yellow: 26, blue: 39
};

const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const HOME_PATHS: Record<Color, [number, number][]> = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]
};

const BASE_POSITIONS: Record<Color, [number, number][]> = {
  red: [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]],
  green: [[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]],
  yellow: [[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]],
  blue: [[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]]
};

const DiceFace: React.FC<{ value: number | null, rolling: boolean }> = ({ value, rolling }) => {
  const renderPips = (val: number) => {
    const pipLayouts: Record<number, number[]> = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    };
    return Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className={`w-2 h-2 rounded-full transition-all duration-200 ${pipLayouts[val]?.includes(i) ? 'bg-slate-900' : 'bg-transparent'}`} />
    ));
  };
  return (
    <div className={`w-14 h-14 bg-white rounded-2xl border-4 border-slate-200 shadow-xl flex items-center justify-center p-2.5 ${rolling ? 'animate-spin' : ''}`}>
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        {value ? renderPips(value) : <div className="col-span-3 row-span-3 flex items-center justify-center"><i className="fa-solid fa-dice text-slate-300 text-3xl"></i></div>}
      </div>
    </div>
  );
};

const LudoGame: React.FC<LudoGameProps> = ({ onGameOver, entryFee }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [mode, setMode] = useState<GameMode>('computer');
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [turn, setTurn] = useState<Color>('red');
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [message, setMessage] = useState<string>("ROLL TO START");
  const [pieces, setPieces] = useState<Piece[]>([]);

  const piecesRef = useRef(pieces);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);

  const initGame = () => {
    const activeColors: Color[] = playerCount === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
    const newPieces = activeColors.flatMap(color =>
      [0, 1, 2, 3].map(i => ({ id: `${color}-${i}`, color, pos: -1 }))
    );
    setPieces(newPieces);
    setTurn('red');
    setGameState('playing');
  };

  const getGlobalIndex = (piece: Piece, relativePos: number) => {
    if (relativePos < 0 || relativePos > 51) return -1;
    return (relativePos + START_OFFSETS[piece.color]) % 52;
  };

  const nextTurn = useCallback((bonus = false) => {
    setDice(null);
    setIsMoving(false);
    if (!bonus) {
      const sequence: Color[] = playerCount === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
      const nextColor = sequence[(sequence.indexOf(turn) + 1) % sequence.length];
      setTurn(nextColor);
      setMessage(`${nextColor.toUpperCase()}'S TURN`);
    } else {
      setMessage(`EXTRA ROLL!`);
    }
  }, [turn, playerCount]);

  const rollDice = () => {
    if (isRolling || isMoving || dice !== null) return;
    setIsRolling(true);
    soundService.playDice();
    
    // AI turns roll faster (300ms vs 600ms)
    const rollDuration = mode === 'computer' && turn !== 'red' ? 300 : 600;

    setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      setDice(val);
      setIsRolling(false);

      const available = piecesRef.current.filter(p => p.color === turn && (p.pos === -1 ? val === 6 : p.pos + val <= 57));
      if (available.length === 0) {
        setMessage("SKIP!");
        setTimeout(() => nextTurn(false), 800);
      } else {
        setMessage("MOVE A PIECE");
        if (mode === 'computer' && turn !== 'red') {
          // AI decision is faster (400ms thinking)
          setTimeout(() => performAIMove(available, val), 400);
        }
      }
    }, rollDuration);
  };

  const performAIMove = (available: Piece[], roll: number) => {
    const sorted = [...available].sort((a, b) => b.pos - a.pos);
    const killer = available.find(p => {
       if (p.pos === -1) return false;
       const nextGIdx = getGlobalIndex(p, p.pos + roll);
       return piecesRef.current.some(other => other.color !== turn && other.pos >= 0 && other.pos <= 51 && getGlobalIndex(other, other.pos) === nextGIdx);
    });
    const target = killer || available.find(p => p.pos === -1 && roll === 6) || sorted[0];
    movePiece(target.id, roll);
  };

  const movePiece = async (pieceId: string, rollValue?: number) => {
    const activeDice = rollValue || dice;
    if (activeDice === null || isRolling || isMoving) return;
    const piece = piecesRef.current.find(p => p.id === pieceId);
    if (!piece || piece.color !== turn) return;
    
    if (piece.pos === -1 && activeDice !== 6) return;
    if (piece.pos !== -1 && piece.pos + activeDice > 57) return;

    setIsMoving(true);
    const steps = piece.pos === -1 ? 1 : activeDice;
    let currentPos = piece.pos;

    // Movement animation is kept clear but rapid for AI (100ms per step)
    const stepDuration = mode === 'computer' && turn !== 'red' ? 80 : 120;

    for (let i = 0; i < steps; i++) {
      currentPos = currentPos === -1 ? 0 : currentPos + 1;
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, pos: currentPos } : p));
      soundService.playMove();
      await new Promise(r => setTimeout(r, stepDuration));
    }

    let bonus = activeDice === 6;
    if (currentPos >= 0 && currentPos <= 51) {
      const gIdx = getGlobalIndex(piece, currentPos);
      if (!SAFE_INDICES.includes(gIdx)) {
        const victim = piecesRef.current.find(p => p.color !== turn && p.pos >= 0 && p.pos <= 51 && getGlobalIndex(p, p.pos) === gIdx);
        if (victim) {
          setPieces(prev => prev.map(p => p.id === victim.id ? { ...p, pos: -1 } : p));
          soundService.playCapture();
          bonus = true;
          setMessage("PIECE CAPTURED!");
        }
      }
    }

    if (currentPos === 57) {
      soundService.playWin();
      bonus = true;
      if (piecesRef.current.filter(p => p.color === turn && p.pos === 57).length + 1 === 4) {
        onGameOver(entryFee * playerCount);
        return;
      }
    }

    nextTurn(bonus);
  };

  // AI Automatic Turn Handling
  useEffect(() => {
    if (gameState === 'playing' && mode === 'computer' && turn !== 'red' && !isRolling && !isMoving && dice === null) {
      const turnTimer = setTimeout(() => rollDice(), 600);
      return () => clearTimeout(turnTimer);
    }
  }, [turn, isRolling, isMoving, dice, gameState, mode]);

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in zoom-in duration-300 bg-slate-950">
        <div className="w-24 h-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-slate-900 shadow-red-600/30">
          <i className="fa-solid fa-chess-board text-4xl text-white"></i>
        </div>
        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">LUDO WORLD</h2>
        
        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMode('computer')} className={`p-5 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'computer' ? 'bg-indigo-600 border-white shadow-xl scale-105' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <i className="fa-solid fa-robot text-xl"></i>
              <span className="font-black text-[10px] uppercase">vs Computer</span>
            </button>
            <button onClick={() => setMode('local')} className={`p-5 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'local' ? 'bg-indigo-600 border-white shadow-xl scale-105' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
              <i className="fa-solid fa-user-group text-xl"></i>
              <span className="font-black text-[10px] uppercase">Pass & Play</span>
            </button>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Match Size</p>
             <div className="flex gap-4 justify-center">
                <button onClick={() => setPlayerCount(2)} className={`flex-1 py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${playerCount === 2 ? 'bg-amber-500 border-white text-slate-950' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                   1 vs 1
                </button>
                <button onClick={() => setPlayerCount(4)} className={`flex-1 py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${playerCount === 4 ? 'bg-amber-500 border-white text-slate-950' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                   4 Players
                </button>
             </div>
          </div>
        </div>

        <button onClick={initGame} className="w-full bg-indigo-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-600/40 active:scale-95 transition-transform text-white">
          START MATCH
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-2 gap-4 select-none overflow-hidden font-sans">
      <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-3xl shadow-xl">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg" style={{ backgroundColor: COLORS[turn] }}>
               <i className={`fa-solid ${mode === 'computer' && turn !== 'red' ? 'fa-robot' : 'fa-user'} text-white`}></i>
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">PLAYER TURN</p>
               <h3 className="text-sm font-black text-white uppercase italic tracking-tighter" style={{ color: COLORS[turn] }}>{turn}</h3>
            </div>
         </div>
         <span className={`text-[9px] font-black uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10 ${turn === 'red' ? 'text-white' : 'text-slate-500'}`}>{message}</span>
      </div>

      <div className="relative w-full aspect-square max-w-[400px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-[8px] border-slate-900 overflow-hidden grid mx-auto" style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}>
        
        {/* Bases */}
        <div className="col-span-6 row-span-6 border-r-2 border-b-2 border-slate-900 p-4" style={{ backgroundColor: COLORS.red }}>
           <div className="w-full h-full bg-white/20 rounded-3xl border-2 border-white/40 grid grid-cols-2 grid-rows-2 p-2 gap-2">
              {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-full bg-white/30 border-2 border-white/40" />)}
           </div>
        </div>
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
           {Array.from({ length: 18 }).map((_, i) => {
              const x = 6 + (i % 3); const y = Math.floor(i / 3);
              const isHome = x === 7 && y > 0 && y < 6;
              const isStar = (x === 8 && y === 1) || (x === 6 && y === 2);
              return <div key={i} className="border-[0.5px] border-slate-200 flex items-center justify-center" style={{ backgroundColor: isHome ? COLORS.green : 'white' }}>{isStar && <i className="fa-solid fa-star text-[8px] text-emerald-500"></i>}</div>;
           })}
        </div>
        <div className="col-span-6 row-span-6 border-l-2 border-b-2 border-slate-900 p-4" style={{ backgroundColor: COLORS.green }}>
           <div className="w-full h-full bg-white/20 rounded-3xl border-2 border-white/40 grid grid-cols-2 grid-rows-2 p-2 gap-2">
              {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-full bg-white/30 border-2 border-white/40" />)}
           </div>
        </div>

        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
           {Array.from({ length: 18 }).map((_, i) => {
              const x = i % 6; const y = 6 + Math.floor(i / 6);
              const isHome = y === 7 && x > 0 && x < 6;
              const isStar = (x === 1 && y === 6) || (x === 2 && y === 8);
              return <div key={i} className="border-[0.5px] border-slate-200 flex items-center justify-center" style={{ backgroundColor: isHome ? COLORS.red : 'white' }}>{isStar && <i className="fa-solid fa-star text-[8px] text-red-500"></i>}</div>;
           })}
        </div>
        <div className="col-span-3 row-span-3 bg-slate-900">
           <svg viewBox="0 0 100 100" className="w-full h-full">
             <polygon points="0,0 50,50 100,0" fill={COLORS.green} />
             <polygon points="100,0 50,50 100,100" fill={COLORS.yellow} />
             <polygon points="100,100 50,50 0,100" fill={COLORS.blue} />
             <polygon points="0,100 50,50 0,0" fill={COLORS.red} />
           </svg>
        </div>
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3">
           {Array.from({ length: 18 }).map((_, i) => {
              const x = 9 + (i % 6); const y = 6 + Math.floor(i / 6);
              const isHome = y === 7 && x > 8 && x < 14;
              const isStar = (x === 13 && y === 8) || (x === 12 && y === 6);
              return <div key={i} className="border-[0.5px] border-slate-200 flex items-center justify-center" style={{ backgroundColor: isHome ? COLORS.yellow : 'white' }}>{isStar && <i className="fa-solid fa-star text-[8px] text-amber-500"></i>}</div>;
           })}
        </div>

        <div className="col-span-6 row-span-6 border-r-2 border-t-2 border-slate-900 p-4" style={{ backgroundColor: COLORS.blue }}>
           <div className="w-full h-full bg-white/20 rounded-3xl border-2 border-white/40 grid grid-cols-2 grid-rows-2 p-2 gap-2">
              {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-full bg-white/30 border-2 border-white/40" />)}
           </div>
        </div>
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6">
           {Array.from({ length: 18 }).map((_, i) => {
              const x = 6 + (i % 3); const y = 9 + Math.floor(i / 3);
              const isHome = x === 7 && y > 8 && y < 14;
              const isStar = (x === 6 && y === 13) || (x === 8 && y === 12);
              return <div key={i} className="border-[0.5px] border-slate-200 flex items-center justify-center" style={{ backgroundColor: isHome ? COLORS.blue : 'white' }}>{isStar && <i className="fa-solid fa-star text-[8px] text-blue-500"></i>}</div>;
           })}
        </div>
        <div className="col-span-6 row-span-6 border-l-2 border-t-2 border-slate-900 p-4" style={{ backgroundColor: COLORS.yellow }}>
           <div className="w-full h-full bg-white/20 rounded-3xl border-2 border-white/40 grid grid-cols-2 grid-rows-2 p-2 gap-2">
              {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-full bg-white/30 border-2 border-white/40" />)}
           </div>
        </div>

        {/* Pieces Layer */}
        <div className="absolute inset-0 pointer-events-none z-[100]">
          {pieces.map(p => {
            if (p.pos === 57) return null;
            let x=0, y=0;
            if (p.pos === -1) {
              const pIdx = pieces.filter(o => o.color === p.color).indexOf(p);
              [x, y] = BASE_POSITIONS[p.color][pIdx];
            } else if (p.pos <= 51) {
              [x, y] = BOARD_PATH[getGlobalIndex(p, p.pos)];
            } else {
              [x, y] = HOME_PATHS[p.color][p.pos - 52];
            }
            
            const piecesOnSameSquare = pieces.filter(o => {
              if (o.pos === -1 || p.pos === -1) return false;
              if (o.pos <= 51 && p.pos <= 51) return getGlobalIndex(o, o.pos) === getGlobalIndex(p, p.pos);
              if (o.pos > 51 && p.pos > 51) return o.pos === p.pos && o.color === p.color;
              return false;
            });
            const offsetIdx = piecesOnSameSquare.indexOf(p);
            const offsetX = piecesOnSameSquare.length > 1 ? (offsetIdx - (piecesOnSameSquare.length - 1) / 2) * 3 : 0;
            const offsetY = piecesOnSameSquare.length > 1 ? (offsetIdx - (piecesOnSameSquare.length - 1) / 2) * -3 : 0;

            const canMove = dice !== null && turn === p.color && (p.pos === -1 ? dice === 6 : p.pos + dice <= 57) && !isMoving && (mode === 'local' || turn === 'red');
            
            return (
              <button key={p.id} onClick={() => movePiece(p.id)} disabled={!canMove} className={`absolute w-6 h-6 flex items-center justify-center transition-all duration-300 pointer-events-auto ${canMove ? 'animate-bounce cursor-pointer z-[200]' : 'z-[100]'}`} style={{ left: `${(x/15)*100}%`, top: `${(y/15)*100}%`, transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)` }}>
                <div className={`relative w-full h-full group ${canMove ? 'animate-pulse' : ''}`}>
                   <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-3 rounded-[100%] border border-white/60 shadow-lg`} style={{ backgroundColor: COLORS[p.color] }} />
                   <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-sm border-x border-white/40`} style={{ backgroundColor: COLORS[p.color] }} />
                   <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border border-white/60 shadow-md ${canMove ? 'scale-110' : ''}`} style={{ backgroundColor: COLORS[p.color] }}>
                      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white/40 rounded-full blur-[0.5px]" />
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto bg-slate-900 border-4 border-slate-800 p-6 rounded-[3.5rem] shadow-2xl flex items-center justify-between gap-6 max-w-[420px] mx-auto w-full relative overflow-hidden">
         <div className="absolute inset-0 bg-white/5 opacity-10 pointer-events-none" />
         <button onClick={rollDice} disabled={isRolling || isMoving || dice !== null || (mode === 'computer' && turn !== 'red')} className="relative z-10 active:scale-95 transition-transform group">
           <DiceFace value={dice} rolling={isRolling} />
           <p className="text-[7px] font-black text-slate-500 uppercase text-center mt-2 tracking-widest group-disabled:opacity-20">TAP ROLL</p>
         </button>
         <div className="flex-1 bg-black/40 py-5 px-6 rounded-3xl border border-white/10 shadow-inner">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
            <p className="text-white font-black text-xs uppercase italic tracking-tighter leading-none">
              {isRolling ? "Neural Roll..." : isMoving ? "Calculating..." : message}
            </p>
         </div>
         <div className="flex flex-col gap-2">
            <button onClick={() => setGameState('setup')} className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center active:bg-red-500/20 shadow-lg">
               <i className="fa-solid fa-power-off"></i>
            </button>
         </div>
      </div>
    </div>
  );
};

export default LudoGame;
