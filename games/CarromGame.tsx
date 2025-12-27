
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundService } from '../services/soundService';

interface CarromGameProps {
  onGameOver: (tokensEarned: number) => void;
  entryFee: number;
}

type PieceType = 'striker' | 'black' | 'white' | 'queen';

interface Vector {
  x: number;
  y: number;
}

interface Piece {
  id: string;
  type: PieceType;
  pos: Vector;
  vel: Vector;
  radius: number;
  mass: number;
  inPocket: boolean;
}

const BOARD_SIZE = 400;
const POCKET_RADIUS = 25;
const FRICTION = 0.985;
const STRIKER_RADIUS = 18;
const COIN_RADIUS = 12;
const MIN_VELOCITY = 0.1;

// The "Double Line" area for the striker
const BASELINE_TOP = BOARD_SIZE - 75;
const BASELINE_BOTTOM = BOARD_SIZE - 45;
const STRIKER_Y = (BASELINE_TOP + BASELINE_BOTTOM) / 2; // Exactly in the middle of the lines

const CarromGame: React.FC<CarromGameProps> = ({ onGameOver, entryFee }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [showGuide, setShowGuide] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [strikerX, setStrikerX] = useState(BOARD_SIZE / 2);
  const [isAiming, setIsAiming] = useState(false);
  const [aimVector, setAimVector] = useState<Vector>({ x: 0, y: 0 });
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [message, setMessage] = useState("Your Turn");

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const initBoard = useCallback(() => {
    const newPieces: Piece[] = [];
    
    // Queen in center
    newPieces.push({
      id: 'queen', type: 'queen', pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 },
      vel: { x: 0, y: 0 }, radius: COIN_RADIUS, mass: 1, inPocket: false
    });

    const angleStep = (Math.PI * 2) / 6;
    const innerRadius = COIN_RADIUS * 2.1;
    const outerRadius = COIN_RADIUS * 4.2;

    // Inner ring
    for (let i = 0; i < 6; i++) {
      const type = i % 2 === 0 ? 'white' : 'black';
      newPieces.push({
        id: `inner-${i}`, type,
        pos: {
          x: BOARD_SIZE / 2 + Math.cos(i * angleStep) * innerRadius,
          y: BOARD_SIZE / 2 + Math.sin(i * angleStep) * innerRadius
        },
        vel: { x: 0, y: 0 }, radius: COIN_RADIUS, mass: 1, inPocket: false
      });
    }

    // Outer ring
    for (let i = 0; i < 12; i++) {
      const type = i % 2 === 0 ? 'black' : 'white';
      const angle = (i * Math.PI * 2) / 12;
      newPieces.push({
        id: `outer-${i}`, type,
        pos: {
          x: BOARD_SIZE / 2 + Math.cos(angle) * outerRadius,
          y: BOARD_SIZE / 2 + Math.sin(angle) * outerRadius
        },
        vel: { x: 0, y: 0 }, radius: COIN_RADIUS, mass: 1, inPocket: false
      });
    }

    // Striker - Centered in baseline
    newPieces.push({
      id: 'striker', type: 'striker', pos: { x: BOARD_SIZE / 2, y: STRIKER_Y },
      vel: { x: 0, y: 0 }, radius: STRIKER_RADIUS, mass: 1.5, inPocket: false
    });

    setPieces(newPieces);
    setGameState('playing');
  }, []);

  const handlePocket = (piece: Piece) => {
    piece.inPocket = true;
    piece.vel = { x: 0, y: 0 };
    soundService.playWin();

    if (piece.type === 'white') setScore(s => ({ ...s, player: s.player + 20 }));
    if (piece.type === 'black') setScore(s => ({ ...s, player: s.player + 10 }));
    if (piece.type === 'queen') {
       setScore(s => ({ ...s, player: s.player + 50 }));
       setMessage("Awesome! Potted the Queen.");
    }
  };

  const updatePhysics = (dt: number) => {
    setPieces(prevPieces => {
      const nextPieces = prevPieces.map(p => ({ ...p }));
      let activeMotion = false;

      nextPieces.forEach(p => {
        if (p.inPocket) return;

        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        p.vel.x *= FRICTION;
        p.vel.y *= FRICTION;

        if (Math.abs(p.vel.x) < MIN_VELOCITY) p.vel.x = 0;
        if (Math.abs(p.vel.y) < MIN_VELOCITY) p.vel.y = 0;

        if (p.vel.x !== 0 || p.vel.y !== 0) activeMotion = true;

        if (p.pos.x < p.radius || p.pos.x > BOARD_SIZE - p.radius) {
          p.vel.x *= -0.8;
          p.pos.x = p.pos.x < p.radius ? p.radius : BOARD_SIZE - p.radius;
        }
        if (p.pos.y < p.radius || p.pos.y > BOARD_SIZE - p.radius) {
          p.vel.y *= -0.8;
          p.pos.y = p.pos.y < p.radius ? p.radius : BOARD_SIZE - p.radius;
        }

        const corners = [
          { x: 0, y: 0 }, { x: BOARD_SIZE, y: 0 },
          { x: 0, y: BOARD_SIZE }, { x: BOARD_SIZE, y: BOARD_SIZE }
        ];
        corners.forEach(corner => {
          const dist = Math.hypot(p.pos.x - corner.x, p.pos.y - corner.y);
          if (dist < POCKET_RADIUS) handlePocket(p);
        });
      });

      for (let i = 0; i < nextPieces.length; i++) {
        for (let j = i + 1; j < nextPieces.length; j++) {
          const p1 = nextPieces[i];
          const p2 = nextPieces[j];
          if (p1.inPocket || p2.inPocket) continue;

          const dx = p2.pos.x - p1.pos.x;
          const dy = p2.pos.y - p1.pos.y;
          const distance = Math.hypot(dx, dy);
          const minDist = p1.radius + p2.radius;

          if (distance < minDist) {
            soundService.playMove();
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const overlap = minDist - distance;
            const nx = dx / distance;
            const ny = dy / distance;
            p1.pos.x -= nx * overlap / 2;
            p1.pos.y -= ny * overlap / 2;
            p2.pos.x += nx * overlap / 2;
            p2.pos.y += ny * overlap / 2;

            const v1 = {
              x: p1.vel.x * cos + p1.vel.y * sin,
              y: p1.vel.y * cos - p1.vel.x * sin
            };
            const v2 = {
              x: p2.vel.x * cos + p2.vel.y * sin,
              y: p2.vel.y * cos - p2.vel.x * sin
            };

            const v1Final = ((p1.mass - p2.mass) * v1.x + 2 * p2.mass * v2.x) / (p1.mass + p2.mass);
            const v2Final = ((p2.mass - p1.mass) * v2.x + 2 * p1.mass * v1.x) / (p1.mass + p2.mass);

            p1.vel.x = v1Final * cos - v1.y * sin;
            p1.vel.y = v1.y * cos + v1Final * sin;
            p2.vel.x = v2Final * cos - v2.y * sin;
            p2.vel.y = v2.y * cos + v2Final * sin;
          }
        }
      }

      if (!activeMotion && isMoving) {
        setIsMoving(false);
        resetStriker(nextPieces);
      }

      return nextPieces;
    });
  };

  const resetStriker = (currentPieces: Piece[]) => {
    const striker = currentPieces.find(p => p.id === 'striker');
    if (striker) {
      striker.inPocket = false;
      striker.vel = { x: 0, y: 0 };
      striker.pos = { x: strikerX, y: STRIKER_Y };
    }
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const dt = time - lastTimeRef.current;
      updatePhysics(dt);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isMoving]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMoving) return;
    setIsAiming(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAiming || isMoving) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * (BOARD_SIZE / rect.width);
    const y = (clientY - rect.top) * (BOARD_SIZE / rect.height);

    const striker = pieces.find(p => p.id === 'striker');
    if (striker) {
      setAimVector({
        x: striker.pos.x - x,
        y: striker.pos.y - y
      });
    }
  };

  const handleMouseUp = () => {
    if (!isAiming || isMoving) return;
    setIsAiming(false);
    
    const power = Math.min(Math.hypot(aimVector.x, aimVector.y) / 10, 15);
    if (power < 1) return;

    const angle = Math.atan2(aimVector.y, aimVector.x);
    
    setPieces(prev => prev.map(p => {
      if (p.id === 'striker') {
        return {
          ...p,
          vel: {
            x: Math.cos(angle) * power,
            y: Math.sin(angle) * power
          }
        };
      }
      return p;
    }));
    
    setIsMoving(true);
    setAimVector({ x: 0, y: 0 });
    soundService.playDice();
  };

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-amber-700 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-slate-900">
          <i className="fa-solid fa-circle-dot text-4xl text-amber-100"></i>
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Carrom Board</h2>
          <p className="text-slate-500 font-bold text-xs tracking-widest uppercase">Precision & Skill</p>
        </div>
        <div className="w-full space-y-4">
          <button onClick={initBoard} className="w-full bg-indigo-600 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-600/40 active:scale-95 transition-transform">
            START GAME
          </button>
          <button onClick={() => setShowGuide(true)} className="w-full bg-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400">
            HOW TO PLAY
          </button>
        </div>

        {showGuide && (
          <div className="fixed inset-0 bg-slate-950/95 z-[200] p-8 flex flex-col items-center justify-center space-y-6">
            <h3 className="text-2xl font-black uppercase italic text-amber-500">Guide</h3>
            <div className="space-y-4 text-left max-w-xs text-slate-300">
              <p className="text-sm">• Use the slider below the board to position the striker.</p>
              <p className="text-sm">• Drag back from the striker and release to strike.</p>
              <p className="text-sm">• Striker must stay between the "double lines" before shooting.</p>
            </div>
            <button onClick={() => setShowGuide(false)} className="bg-indigo-600 px-8 py-3 rounded-full font-black text-xs uppercase">Got it</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 gap-4 h-full">
      <div className="flex justify-between items-center w-full max-w-[400px] bg-slate-800 p-3 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-black">P</div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase">Score</p>
            <p className="text-sm font-black text-white">{score.player}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-indigo-400 uppercase italic">{isMoving ? "In Motion..." : message}</p>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-w-[400px] bg-[#d2b48c] border-[12px] border-[#3e2723] rounded-3xl overflow-hidden shadow-2xl"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Pockets */}
        <div className="absolute top-[-10px] left-[-10px] w-12 h-12 bg-black rounded-full" />
        <div className="absolute top-[-10px] right-[-10px] w-12 h-12 bg-black rounded-full" />
        <div className="absolute bottom-[-10px] left-[-10px] w-12 h-12 bg-black rounded-full" />
        <div className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-black rounded-full" />

        {/* Board Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-black rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full" />
          
          {/* Baseline area ("Double Lines") */}
          <div className="absolute left-16 right-16 border-y border-black" style={{ top: BASELINE_TOP, height: BASELINE_BOTTOM - BASELINE_TOP }} />
          <div className="absolute left-16 right-16 border-y border-black" style={{ top: 45, height: 30 }} />
          <div className="absolute top-16 bottom-16 border-x border-black" style={{ left: 45, width: 30 }} />
          <div className="absolute top-16 bottom-16 border-x border-black" style={{ left: BOARD_SIZE - 75, width: 30 }} />
        </div>

        {/* Striker Visualization */}
        {pieces.map(p => !p.inPocket && (
          <div 
            key={p.id}
            className={`absolute rounded-full shadow-md transition-shadow ${p.type === 'striker' ? 'border-2 border-black/20' : ''}`}
            style={{
              left: p.pos.x,
              top: p.pos.y,
              width: p.radius * 2,
              height: p.radius * 2,
              transform: 'translate(-50%, -50%)',
              backgroundColor: p.type === 'white' ? '#f5f5f5' : p.type === 'black' ? '#212121' : p.type === 'queen' ? '#e91e63' : '#fff',
              zIndex: p.type === 'striker' ? 50 : 10
            }}
          >
            {p.type === 'striker' && <div className="absolute inset-2 border border-black/10 rounded-full" />}
          </div>
        ))}

        {/* Aim Indicator */}
        {isAiming && (
          <div 
            className="absolute bg-white/40 origin-left pointer-events-none"
            style={{
              left: pieces.find(p => p.id === 'striker')?.pos.x,
              top: pieces.find(p => p.id === 'striker')?.pos.y,
              width: Math.hypot(aimVector.x, aimVector.y),
              height: 2,
              transform: `rotate(${Math.atan2(aimVector.y, aimVector.x)}rad)`
            }}
          />
        )}
      </div>

      <div className="w-full max-w-[400px] space-y-6">
        <div className="px-4">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 text-center">Position Striker (Within Lines)</p>
          <input 
            type="range"
            min={80}
            max={320}
            value={strikerX}
            disabled={isMoving}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setStrikerX(val);
              setPieces(prev => prev.map(p => p.id === 'striker' ? { ...p, pos: { x: val, y: STRIKER_Y } } : p));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default CarromGame;
