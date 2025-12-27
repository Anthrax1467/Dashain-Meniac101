import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundService } from '../services/soundService';

interface SnakeGameProps {
  onGameOver: (tokensEarned: number) => void;
  entryFee: number;
}

const GRID_SIZE = 15;
const INITIAL_SPEED = 200; 
const INITIAL_LIVES = 3;

type DecorationType = 'tree' | 'stone' | 'house' | 'goat' | 'pot' | 'swing' | 'flower' | 'shrine';
interface Decoration {
  x: number;
  y: number;
  type: DecorationType;
  rotation: number;
  scale: number;
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onGameOver, entryFee }) => {
  const [snake, setSnake] = useState([{ x: 7, y: 7 }, { x: 7, y: 8 }, { x: 7, y: 9 }]);
  const [food, setFood] = useState({ x: 3, y: 3 });
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [dir, setDir] = useState({ x: 0, y: -1 });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [isPaused, setIsPaused] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [tongueOut, setTongueOut] = useState(false);
  const lastDirRef = useRef({ x: 0, y: -1 });

  // Initialize Varied Decorations (formerly obstacles)
  useEffect(() => {
    const newDecos: Decoration[] = [];
    const types: DecorationType[] = ['tree', 'stone', 'house', 'goat', 'pot', 'swing', 'flower', 'shrine'];
    const count = 12 + Math.floor(Math.random() * 8); 

    while (newDecos.length < count) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      
      const isStartPos = snake.some(s => Math.abs(s.x - x) < 2 && Math.abs(s.y - y) < 2);
      const isFoodPos = x === 3 && y === 3;
      const isDuplicate = newDecos.some(obs => obs.x === x && obs.y === y);
      
      if (!isStartPos && !isFoodPos && !isDuplicate) {
        newDecos.push({
          x, y,
          type: types[Math.floor(Math.random() * types.length)],
          rotation: (Math.random() - 0.5) * 45,
          scale: 0.7 + Math.random() * 0.5
        });
      }
    }
    setDecorations(newDecos);
  }, []);

  // Tongue animation flicker
  useEffect(() => {
    const interval = setInterval(() => {
      setTongueOut(prev => !prev);
    }, 200 + Math.random() * 200);
    return () => clearInterval(interval);
  }, []);

  const handleSelfCollision = useCallback(() => {
    if (lives > 1) {
      setLives(l => l - 1);
      soundService.playFunnyCrash();
      // Temporary "Ghost" state or small reset
      setSnake([{ x: 7, y: 7 }, { x: 7, y: 8 }, { x: 7, y: 9 }]);
      setDir({ x: 0, y: -1 });
      lastDirRef.current = { x: 0, y: -1 };
    } else {
      setIsDead(true);
      soundService.playFunnyCrash();
    }
  }, [lives]);

  const moveSnake = useCallback(() => {
    if (isPaused || isDead) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      // Screen Wrapping Logic (Smooth transition for beginners)
      const newHead = {
        x: (head.x + dir.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + dir.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check self-collision
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        handleSelfCollision();
        return prevSnake;
      }

      // No-clip for decorations with sound feedback
      if (decorations.some(d => d.x === newHead.x && d.y === newHead.y)) {
        soundService.playTab();
      }

      const newSnake = [newHead, ...prevSnake];
      lastDirRef.current = dir;

      // Check food (Dashain Kite)
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        soundService.playFunnyEat();
        
        let newFood = { x: 0, y: 0 };
        let isValid = false;
        while (!isValid) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          };
          isValid = !newSnake.some(s => s.x === newFood.x && s.y === newFood.y);
        }
        setFood(newFood);
        // Gradually increase speed based on score
        setSpeed(s => Math.max(80, INITIAL_SPEED - Math.floor(score / 5))); 
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [dir, food, isPaused, isDead, decorations, handleSelfCollision, score]);

  useEffect(() => {
    const timer = setInterval(moveSnake, speed);
    return () => clearInterval(timer);
  }, [moveSnake, speed]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp': if (lastDirRef.current.y === 0) setDir({ x: 0, y: -1 }); break;
      case 'ArrowDown': if (lastDirRef.current.y === 0) setDir({ x: 0, y: 1 }); break;
      case 'ArrowLeft': if (lastDirRef.current.x === 0) setDir({ x: -1, y: 0 }); break;
      case 'ArrowRight': if (lastDirRef.current.x === 0) setDir({ x: 1, y: 0 }); break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const changeDir = (newDir: { x: number, y: number }) => {
    if (newDir.x !== -lastDirRef.current.x || newDir.y !== -lastDirRef.current.y) {
      soundService.playClick();
      setDir(newDir);
    }
  };

  if (isDead) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-red-600/40 border-4 border-white rotate-12">
          <i className="fa-solid fa-face-sad-cry text-white text-4xl"></i>
        </div>
        <h2 className="text-5xl font-black italic uppercase tracking-tighter glitch-text">Hosh Harayo!</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 mb-8">Score: {score}</p>
        <button 
          onClick={() => onGameOver(score > 50 ? entryFee * 2 : 0)} 
          className="w-full bg-red-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-transform"
        >
          CLAIM WINNINGS
        </button>
      </div>
    );
  }

  // Visual Intensity calculations
  const glowIntensity = Math.min(score / 2, 60);
  const hueShift = (score * 6) % 360;

  return (
    <div className="flex flex-col items-center p-4 gap-4 h-full select-none overflow-hidden">
      {/* HUD */}
      <div className="flex justify-between items-center w-full bg-black/40 p-4 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Kites Cut</span>
          <span className="text-2xl font-black text-amber-500 italic leading-none">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Lives</span>
          <div className="flex gap-1.5 mt-1">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <i key={i} className={`fa-solid fa-heart text-xs transition-all duration-300 ${i < lives ? 'text-red-500 scale-110 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-slate-700 opacity-20'}`}></i>
            ))}
          </div>
        </div>
        <button onClick={() => setIsPaused(!isPaused)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'} text-xs text-slate-300`}></i>
        </button>
      </div>

      {/* Dynamic Game Field */}
      <div 
        className="relative w-full aspect-square max-w-[380px] bg-emerald-950/30 backdrop-blur-xl rounded-[3rem] border-4 border-white/10 overflow-hidden shadow-2xl grid"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none opacity-5">
           {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
             <div key={i} className="border border-white/10"></div>
           ))}
        </div>

        {/* Decorative Elements */}
        {decorations.map((d, i) => (
          <div 
            key={`deco-${i}`}
            className="flex items-center justify-center p-1 pointer-events-none"
            style={{ 
              gridColumnStart: d.x + 1, 
              gridRowStart: d.y + 1,
              transform: `rotate(${d.rotation}deg) scale(${d.scale})`,
              opacity: 0.6
            }}
          >
             <div className="text-xl drop-shadow-2xl">
               {d.type === 'tree' && <i className="fa-solid fa-tree text-emerald-600"></i>}
               {d.type === 'stone' && <i className="fa-solid fa-mountain text-slate-500"></i>}
               {d.type === 'house' && <i className="fa-solid fa-house-chimney text-amber-800"></i>}
               {d.type === 'goat' && <i className="fa-solid fa-hippo text-orange-200"></i>} 
               {d.type === 'pot' && <i className="fa-solid fa-leaf text-green-400"></i>}
               {d.type === 'swing' && <i className="fa-solid fa-bridge text-amber-600"></i>}
               {d.type === 'flower' && <i className="fa-solid fa-sun text-amber-400"></i>}
               {d.type === 'shrine' && <i className="fa-solid fa-torii-gate text-red-700"></i>}
             </div>
          </div>
        ))}

        {/* Improved Sinuous Snake Rendering */}
        {snake.map((seg, i) => {
          const isHead = i === 0;
          const isTail = i === snake.length - 1;
          const segmentHue = (hueShift - i * 8 + 360) % 360;
          
          // Smooth tapering logic: Head is largest, Tail is smallest
          const scaleFactor = isHead ? 1.5 : isTail ? 0.5 : Math.max(0.6, 1.3 - (i / snake.length) * 0.7);
          
          return (
            <div 
              key={`seg-${i}`}
              className="relative flex items-center justify-center transition-all duration-200 ease-in-out"
              style={{ 
                gridColumnStart: seg.x + 1, 
                gridRowStart: seg.y + 1,
                backgroundColor: isHead ? `hsl(${segmentHue}, 95%, 60%)` : `hsl(${segmentHue}, 75%, 45%)`,
                boxShadow: isHead ? `0 0 ${glowIntensity}px hsl(${segmentHue}, 100%, 50%)` : `0 0 ${glowIntensity / (i + 2)}px hsl(${segmentHue}, 100%, 50%, 0.3)`,
                transform: `scale(${scaleFactor})`,
                zIndex: snake.length - i,
                borderRadius: isHead ? '45% 45% 20% 20%' : isTail ? '20% 20% 70% 70%' : '40%'
              }}
            >
               {isHead && (
                 <div className="w-full h-full relative flex flex-col items-center justify-start">
                    {/* Nepal Dhaka Topi (Himalayan Hat) */}
                    <div className="absolute -top-4 w-5.5 h-4 bg-red-700 rounded-t-md border-b border-black/40 flex flex-wrap overflow-hidden rotate-[-8deg] z-30 shadow-xl">
                        <div className="w-1.5 h-1.5 bg-black/10"></div>
                        <div className="w-1.5 h-1.5 bg-white/20"></div>
                        <div className="w-1.5 h-1.5 bg-red-400/20"></div>
                        <div className="w-1.5 h-1.5 bg-black/5"></div>
                        <div className="w-1.5 h-1.5 bg-yellow-400/10"></div>
                    </div>

                    {/* Flickering Tongue animation */}
                    {tongueOut && (
                        <div className="absolute -top-2.5 w-2.5 h-5 bg-red-500 rounded-full animate-bounce z-10" />
                    )}

                    {/* Procedural Eyes */}
                    <div className="flex gap-2 mt-3.5">
                        <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center border border-black/20 shadow-sm">
                            <div className="w-0.5 h-0.5 bg-black rounded-full animate-pulse" />
                        </div>
                        <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center border border-black/20 shadow-sm">
                            <div className="w-0.5 h-0.5 bg-black rounded-full animate-pulse" />
                        </div>
                    </div>
                 </div>
               )}
            </div>
          );
        })}

        {/* Animated Dashain Kite (Food) */}
        <div 
          className="flex items-center justify-center p-1"
          style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }}
        >
          <div className="kite-anim w-full h-full bg-amber-500 rotate-45 border-2 border-white shadow-[0_0_25px_rgba(245,158,11,1)] relative transition-all duration-300">
            <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[1.5px] h-12 bg-white/60 origin-top rotate-12 shadow-sm"></div>
            <div className="absolute inset-0 flex items-center justify-center -rotate-45">
              <i className="fa-solid fa-bolt text-[12px] text-white/50 animate-pulse"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Touch Navigation */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        <div />
        <button 
          onPointerDown={() => changeDir({ x: 0, y: -1 })} 
          className="w-16 h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center border-2 border-white/10 active:bg-amber-500/50 active:border-amber-500 active:scale-90 transition-all shadow-2xl group"
        >
          <i className="fa-solid fa-chevron-up text-amber-500 text-2xl group-active:text-white"></i>
        </button>
        <div />
        <button 
          onPointerDown={() => changeDir({ x: -1, y: 0 })} 
          className="w-16 h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center border-2 border-white/10 active:bg-amber-500/50 active:border-amber-500 active:scale-90 transition-all shadow-2xl group"
        >
          <i className="fa-solid fa-chevron-left text-amber-500 text-2xl group-active:text-white"></i>
        </button>
        <button 
          onPointerDown={() => changeDir({ x: 0, y: 1 })} 
          className="w-16 h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center border-2 border-white/10 active:bg-amber-500/50 active:border-amber-500 active:scale-90 transition-all shadow-2xl group"
        >
          <i className="fa-solid fa-chevron-down text-amber-500 text-2xl group-active:text-white"></i>
        </button>
        <button 
          onPointerDown={() => changeDir({ x: 1, y: 0 })} 
          className="w-16 h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center border-2 border-white/10 active:bg-amber-500/50 active:border-amber-500 active:scale-90 transition-all shadow-2xl group"
        >
          <i className="fa-solid fa-chevron-right text-amber-500 text-2xl group-active:text-white"></i>
        </button>
      </div>

      {/* Bottom Status Info */}
      <div className="mt-auto px-6 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-2 backdrop-blur-md">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Beginner Friendly: Smooth Wrapping & Ghost Items</p>
      </div>
    </div>
  );
};

export default SnakeGame;