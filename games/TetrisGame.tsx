
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundService } from '../services/soundService';

interface TetrisGameProps {
  onGameOver: (tokensEarned: number) => void;
  entryFee: number;
}

const COLS = 10;
const ROWS = 20;

type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

interface Tetromino {
  shape: number[][];
  color: string;
  glow: string;
}

const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'bg-cyan-400', glow: 'shadow-cyan-400/50' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-blue-600', glow: 'shadow-blue-600/50' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'bg-orange-500', glow: 'shadow-orange-500/50' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400', glow: 'shadow-yellow-400/50' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-purple-600', glow: 'shadow-purple-600/50' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'bg-red-500', glow: 'shadow-red-500/50' },
};

const TetrisGame: React.FC<TetrisGameProps> = ({ onGameOver, entryFee }) => {
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
  const [activePiece, setActivePiece] = useState<{ type: TetrominoType; pos: { x: number; y: number }; shape: number[][] } | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('I');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'gameOver'>('setup');
  const [isPaused, setIsPaused] = useState(false);

  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  const getRandomType = (): TetrominoType => {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const checkCollision = (shape: number[][], pos: { x: number; y: number }, currentGrid: string[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentGrid[newY][newX] !== '')) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const spawnPiece = useCallback(() => {
    const type = nextPieceType;
    const shape = TETROMINOS[type].shape;
    const pos = { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    
    if (checkCollision(shape, pos, gridRef.current)) {
      setGameState('gameOver');
      return;
    }

    setActivePiece({ type, pos, shape });
    setNextPieceType(getRandomType());
  }, [nextPieceType]);

  const rotateMatrix = (matrix: number[][]) => {
    return matrix[0].map((_, index) => matrix.map(col => col[index]).reverse());
  };

  const lockPiece = useCallback(() => {
    if (!activePiece) return;

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = activePiece.pos.y + y;
            const gridX = activePiece.pos.x + x;
            if (gridY >= 0 && gridY < ROWS) {
              newGrid[gridY][gridX] = activePiece.type;
            }
          }
        });
      });

      // Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== '');
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(''));
      }

      if (linesCleared > 0) {
        setScore(s => {
          const newScore = s + [0, 100, 300, 500, 800][linesCleared] * level;
          if (newScore > level * 1000) setLevel(l => l + 1);
          return newScore;
        });
        soundService.playWin();
      }

      return filteredGrid;
    });

    setActivePiece(null); // Triggers useEffect to spawn next piece
    soundService.playTab();
  }, [activePiece, level]);

  const move = useCallback((dir: { x: number; y: number }) => {
    if (!activePiece || isPaused || gameState !== 'playing') return;
    
    const newPos = { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y };
    if (!checkCollision(activePiece.shape, newPos, gridRef.current)) {
      setActivePiece(prev => prev ? { ...prev, pos: newPos } : null);
      if (dir.x !== 0) soundService.playMove();
      return true;
    } else if (dir.y > 0) {
      lockPiece();
      return false;
    }
    return false;
  }, [activePiece, isPaused, gameState, lockPiece]);

  const hardDrop = () => {
    if (!activePiece || isPaused || gameState !== 'playing') return;
    let newY = activePiece.pos.y;
    while (!checkCollision(activePiece.shape, { x: activePiece.pos.x, y: newY + 1 }, gridRef.current)) {
      newY++;
    }
    setActivePiece(prev => prev ? { ...prev, pos: { x: prev.pos.x, y: newY } } : null);
    soundService.playCapture();
    // Use a small timeout to let the state update before locking
    setTimeout(lockPiece, 50);
  };

  const handleRotate = () => {
    if (!activePiece || isPaused || gameState !== 'playing') return;
    const newShape = rotateMatrix(activePiece.shape);
    if (!checkCollision(newShape, activePiece.pos, gridRef.current)) {
      setActivePiece(prev => prev ? { ...prev, shape: newShape } : null);
      soundService.playClick();
    }
  };

  // 1. Spawning logic: Watch for activePiece being null while game is playing
  useEffect(() => {
    if (gameState === 'playing' && !activePiece && !isPaused) {
      spawnPiece();
    }
  }, [activePiece, gameState, isPaused, spawnPiece]);

  // 2. Automated Drop Tick
  useEffect(() => {
    if (isPaused || gameState !== 'playing' || !activePiece) return;

    const intervalTime = Math.max(100, 1000 - (level - 1) * 150);
    const id = setInterval(() => {
      move({ x: 0, y: 1 });
    }, intervalTime);

    return () => clearInterval(id);
  }, [level, isPaused, gameState, activePiece, move]);

  const startGame = () => {
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
    setScore(0);
    setLevel(1);
    setNextPieceType(getRandomType());
    setActivePiece(null);
    setGameState('playing');
    soundService.playClick();
  };

  const getGhostY = () => {
    if (!activePiece) return null;
    let ghostY = activePiece.pos.y;
    while (!checkCollision(activePiece.shape, { x: activePiece.pos.x, y: ghostY + 1 }, grid)) {
      ghostY++;
    }
    return ghostY;
  };

  const ghostY = getGhostY();

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#050505] animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 border-4 border-slate-900 ring-4 ring-indigo-500/20">
          <i className="fa-solid fa-shapes text-4xl text-white"></i>
        </div>
        <h2 className="text-4xl font-black italic uppercase text-white mb-2 tracking-tighter">Tetris Neo</h2>
        <p className="text-indigo-500 font-bold uppercase text-[10px] tracking-[0.4em] mb-12">Universal Matrix Portal</p>
        <button 
          onClick={startGame}
          className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl text-white active:scale-95 transition-all"
        >
          ENTER THE VOID
        </button>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950">
        <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl border-4 border-white rotate-6">
          <i className="fa-solid fa-ghost text-white text-4xl"></i>
        </div>
        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">STABILITY LOST</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 mb-8">Score: {score} | Matrix Level: {level}</p>
        <button 
          onClick={() => onGameOver(score > 500 ? entryFee * 2 : 0)} 
          className="w-full bg-indigo-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform"
        >
          HARVEST TOKENS
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] select-none overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b,transparent)] opacity-20 pointer-events-none" />

      {/* Floating HUD */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
        <div className="bg-black/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex gap-6 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Score</span>
            <span className="text-lg font-black text-amber-500 italic leading-none">{score}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Lv</span>
            <span className="text-lg font-black text-indigo-400 italic leading-none">{level}</span>
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center pointer-events-auto">
          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Next</span>
          <div className="w-8 h-8 flex items-center justify-center">
             <div className="grid grid-cols-4 grid-rows-4 scale-[0.55] origin-center">
               {TETROMINOS[nextPieceType].shape.map((row, y) => row.map((val, x) => (
                 <div key={`${x}-${y}`} className={`w-4 h-4 rounded-[1px] ${val ? TETROMINOS[nextPieceType].color : ''}`} />
               )))}
             </div>
          </div>
        </div>
      </div>

      {/* Playfield Area */}
      <div className="flex-1 flex justify-center items-center px-4 pt-20 pb-40">
         <div className="relative aspect-[1/2] h-full w-full max-h-[70vh] bg-black/60 rounded-3xl border-2 border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] grid grid-cols-10 grid-rows-20">
            {/* Subtle Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-20 pointer-events-none opacity-[0.03]">
                {Array.from({length: 200}).map((_, i) => <div key={i} className="border-[0.5px] border-white" />)}
            </div>

            {/* Static Grid Blocks */}
            {grid.map((row, y) => row.map((cell, x) => (
              <div 
                key={`${x}-${y}`} 
                className={`transition-all duration-300 ${cell ? 'rounded-[3px] border-[0.5px] border-white/20 ' + TETROMINOS[cell as TetrominoType].color + ' ' + TETROMINOS[cell as TetrominoType].glow : ''}`} 
              />
            )))}

            {/* Ghost Landing Guide */}
            {ghostY !== null && activePiece && activePiece.shape.map((row, y) => row.map((val, x) => {
              if (val === 0) return null;
              return (
                <div 
                  key={`ghost-${x}-${y}`}
                  className={`absolute w-[10%] h-[5%] border-2 border-white/10 rounded-[4px] bg-white/5`}
                  style={{ left: `${(activePiece.pos.x + x) * 10}%`, top: `${(ghostY + y) * 5}%` }}
                />
              );
            }))}

            {/* Active Moving Piece */}
            {activePiece && activePiece.shape.map((row, y) => row.map((val, x) => {
              if (val === 0) return null;
              return (
                <div 
                  key={`active-${x}-${y}`}
                  className={`absolute w-[10%] h-[5%] rounded-[4px] border border-white/20 ${TETROMINOS[activePiece.type].color} ${TETROMINOS[activePiece.type].glow} shadow-xl z-20`}
                  style={{ left: `${(activePiece.pos.x + x) * 10}%`, top: `${(activePiece.pos.y + y) * 5}%` }}
                />
              );
            }))}
         </div>
      </div>

      {/* Control Panel Layer */}
      <div className="absolute bottom-4 left-0 right-0 px-4 flex flex-col gap-3 pointer-events-none">
        
        <div className="flex justify-between items-end pointer-events-auto">
            {/* Left/Right controls at the bottom corners */}
            <button 
                onPointerDown={(e) => { e.preventDefault(); move({ x: -1, y: 0 }); }} 
                className="w-18 h-18 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:bg-indigo-600/40 transition-all shadow-xl active:scale-90"
            >
                <i className="fa-solid fa-arrow-left text-white text-2xl"></i>
            </button>

            {/* Center Vertical Controls */}
            <div className="flex flex-col gap-3 items-center">
                <button 
                    onClick={handleRotate} 
                    className="w-22 h-22 bg-amber-500/10 backdrop-blur-2xl rounded-full flex items-center justify-center border-2 border-amber-500/30 active:bg-amber-500/40 transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] active:scale-90"
                >
                    <i className="fa-solid fa-rotate-right text-amber-500 text-3xl"></i>
                </button>
                <button 
                    onPointerDown={(e) => { e.preventDefault(); move({ x: 0, y: 1 }); }} 
                    className="w-28 h-14 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 active:bg-white/20 transition-all shadow-lg"
                >
                    <i className="fa-solid fa-chevron-down text-slate-300 text-xl"></i>
                </button>
            </div>

            <button 
                onPointerDown={(e) => { e.preventDefault(); move({ x: 1, y: 0 }); }} 
                className="w-18 h-18 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:bg-indigo-600/40 transition-all shadow-xl active:scale-90"
            >
                <i className="fa-solid fa-arrow-right text-white text-2xl"></i>
            </button>
        </div>

        {/* Hard Drop full width bar */}
        <div className="w-full pointer-events-auto mt-2">
            <button 
                onClick={hardDrop} 
                className="w-full bg-indigo-600/10 py-5 rounded-2xl border border-indigo-600/30 font-black text-xs uppercase text-indigo-400 tracking-[0.4em] active:bg-indigo-600 active:text-white transition-all shadow-2xl active:translate-y-1"
            >
                HARD DROP <i className="fa-solid fa-angles-down ml-2"></i>
            </button>
        </div>
      </div>

      {/* Floating Pause/Play */}
      <button 
        onClick={() => setIsPaused(!isPaused)} 
        className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/40 text-xs active:text-white transition-colors"
      >
        <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
      </button>

      {/* Pause Interface */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-black italic text-white uppercase mb-4 tracking-tighter">SIGNAL PAUSED</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-12">Matrix in stasis mode</p>
            <button onClick={() => setIsPaused(false)} className="w-full max-w-xs bg-indigo-600 py-6 rounded-full font-black text-xl shadow-2xl shadow-indigo-600/40 active:scale-95">RESUME FEED</button>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
