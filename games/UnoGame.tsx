
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundService } from '../services/soundService';

type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';

interface Card { id: string; color: CardColor; value: CardValue; }
interface UnoGameProps { entryFee: number; userBalance: number; onGameOver: (tokens: number) => void; onRaiseBet: (amount: number) => void; }

const COLORS: Record<string, string> = { 
  red: 'bg-red-500', 
  blue: 'bg-blue-600', 
  green: 'bg-emerald-500', 
  yellow: 'bg-amber-400', 
  wild: 'bg-slate-800' 
};

const UnoGame: React.FC<UnoGameProps> = ({ entryFee, userBalance, onGameOver, onRaiseBet }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'passing'>('setup');
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [mode, setMode] = useState<'local' | 'computer'>('computer');

  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [hands, setHands] = useState<Card[][]>([]); 
  const [turn, setTurn] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<CardColor>('red');
  const [pot, setPot] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [message, setMessage] = useState("Setup your match");
  const [unoCalled, setUnoCalled] = useState<boolean[]>([]);

  const createDeck = () => {
    const newDeck: Card[] = [];
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    colors.forEach(color => {
      for (let i = 0; i <= 9; i++) {
        newDeck.push({ id: `${color}-${i}-1`, color, value: i.toString() as CardValue });
        if (i > 0) newDeck.push({ id: `${color}-${i}-2`, color, value: i.toString() as CardValue });
      }
      ['skip', 'reverse', 'draw2'].forEach(val => {
        newDeck.push({ id: `${color}-${val}-1`, color, value: val as CardValue });
        newDeck.push({ id: `${color}-${val}-2`, color, value: val as CardValue });
      });
    });
    for (let i = 0; i < 4; i++) {
      newDeck.push({ id: `wild-${i}`, color: 'wild', value: 'wild' });
      newDeck.push({ id: `draw4-${i}`, color: 'wild', value: 'draw4' });
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const startMatch = () => {
    const fullDeck = createDeck();
    const newHands = Array.from({ length: playerCount }).map(() => fullDeck.splice(0, 7));
    let firstDiscard = fullDeck.splice(0, 1)[0];
    while (firstDiscard.color === 'wild') {
      fullDeck.push(firstDiscard);
      fullDeck.sort(() => Math.random() - 0.5);
      firstDiscard = fullDeck.splice(0, 1)[0];
    }
    setHands(newHands);
    setDiscardPile([firstDiscard]);
    setActiveColor(firstDiscard.color);
    setDeck(fullDeck);
    setPot(entryFee * playerCount);
    setTurn(0);
    setUnoCalled(Array(playerCount).fill(false));
    setGameState('playing');
    setMessage("Match Started!");
  };

  const isValidPlay = (card: Card) => {
    const topCard = discardPile[discardPile.length - 1];
    if (card.color === 'wild') return true;
    if (card.color === activeColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const drawCard = (pIdx: number, count: number = 1) => {
    if (deck.length < count) return;
    soundService.playClick();
    const newCards = [...deck].splice(0, count);
    setHands(prev => {
      const copy = [...prev];
      copy[pIdx] = [...copy[pIdx], ...newCards];
      return copy;
    });
    setDeck(prev => prev.slice(count));
    
    // Penalize missing UNO
    if (hands[pIdx].length === 1 && !unoCalled[pIdx]) {
        // Already handling below
    }

    if (count === 1 && pIdx === turn) {
      setTimeout(() => proceedTurn((pIdx + 1) % playerCount), 800);
    }
  };

  const proceedTurn = (nextIdx: number) => {
    if (mode === 'local') {
      setGameState('passing');
    }
    setTurn(nextIdx);
  };

  const playCard = async (card: Card, pIdx: number) => {
    if (!isValidPlay(card) || turn !== pIdx) return;
    
    soundService.playMove();
    setHands(prev => {
      const copy = [...prev];
      copy[pIdx] = copy[pIdx].filter(c => c.id !== card.id);
      return copy;
    });
    setDiscardPile(prev => [...prev, card]);

    if (card.color === 'wild') {
      if (mode === 'local' || pIdx === 0) {
        setPendingWild(card);
        setShowColorPicker(true);
      } else {
        const botColor = (['red', 'blue', 'green', 'yellow'] as CardColor[])[Math.floor(Math.random() * 4)];
        applyEffects(card, botColor, pIdx);
      }
    } else {
      applyEffects(card, card.color, pIdx);
    }
  };

  const applyEffects = (card: Card, chosenColor: CardColor, pIdx: number) => {
    setActiveColor(chosenColor);
    let nextT = (pIdx + 1) % playerCount;
    
    if (card.value === 'skip') {
      nextT = (nextT + 1) % playerCount;
      setMessage(`Player ${pIdx + 1} skipped the next!`);
    } else if (card.value === 'reverse' && playerCount === 2) {
      nextT = pIdx; // In 2 player, reverse is skip
      setMessage("Direction Reversed!");
    } else if (card.value === 'draw2') { 
      drawCard(nextT, 2); 
      nextT = (nextT + 1) % playerCount; 
      setMessage("Draw 2 played!");
    } else if (card.value === 'draw4') { 
      drawCard(nextT, 4); 
      nextT = (nextT + 1) % playerCount; 
      setMessage("Draw 4 played!");
    }
    
    proceedTurn(nextT);
    checkWin();
  };

  const checkWin = () => {
    hands.forEach((hand, idx) => {
      if (hand.length === 0) {
        setIsGameOver(true);
        onGameOver(idx === 0 ? pot : 0);
      }
    });
  };

  useEffect(() => {
    if (gameState === 'playing' && mode === 'computer' && turn !== 0 && !isGameOver) {
      const timer = setTimeout(() => {
        const playable = hands[turn].find(isValidPlay);
        if (playable) playCard(playable, turn);
        else drawCard(turn, 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, hands, gameState, mode, isGameOver]);

  const renderCard = (card: Card, onClick?: () => void, hidden: boolean = false, playable: boolean = false) => (
    <div 
      onClick={onClick} 
      className={`
        w-20 h-28 ${hidden ? 'bg-slate-900 border-slate-700' : COLORS[card.color]} 
        border-2 ${playable ? 'border-white ring-4 ring-white/30 scale-105 z-10' : 'border-white/20'} 
        rounded-2xl flex flex-col items-center justify-center shadow-xl cursor-pointer 
        transform hover:-translate-y-4 transition-all relative overflow-hidden
      `}
    >
      {hidden ? (
        <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
           <i className="fa-solid fa-layer-group text-slate-900 text-2xl"></i>
        </div>
      ) : (
        <>
          <div className="absolute top-2 left-2 text-[10px] font-black text-white/40">{card.value.toUpperCase()}</div>
          <div className="w-14 h-20 bg-white/10 rounded-full flex items-center justify-center rotate-12">
            <span className="text-white font-black text-2xl drop-shadow-lg">
              {card.value === 'draw2' ? '+2' : card.value === 'draw4' ? '+4' : card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '⇄' : card.value === 'wild' ? 'W' : card.value}
            </span>
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-black text-white/40 rotate-180">{card.value.toUpperCase()}</div>
        </>
      )}
    </div>
  );

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-slate-900 shadow-red-600/30">
          <i className="fa-solid fa-layer-group text-4xl text-white"></i>
        </div>
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">UNO PRO</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Master the cards</p>
        </div>
        
        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMode('computer')} className={`p-5 rounded-3xl border-2 flex flex-col items-center gap-3 ${mode === 'computer' ? 'bg-indigo-600 border-white shadow-lg scale-105' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
              <i className="fa-solid fa-robot text-2xl"></i>
              <span className="font-black text-[10px] uppercase">Solo vs Bots</span>
            </button>
            <button onClick={() => setMode('local')} className={`p-5 rounded-3xl border-2 flex flex-col items-center gap-3 ${mode === 'local' ? 'bg-indigo-600 border-white shadow-lg scale-105' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
              <i className="fa-solid fa-user-group text-2xl"></i>
              <span className="font-black text-[10px] uppercase">Pass & Play</span>
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-600 uppercase">Players</p>
            <div className="flex gap-4 justify-center">
              {[2, 4].map(n => (
                <button key={n} onClick={() => setPlayerCount(n as 2|4)} className={`w-14 h-14 rounded-full border-2 font-black transition-all ${playerCount === n ? 'bg-amber-500 border-white text-slate-950 scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {n}P
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
           <button onClick={startMatch} className="w-full bg-indigo-600 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-600/40 active:scale-95">START MATCH</button>
           <button onClick={() => setShowGuide(true)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-2">How to play?</button>
        </div>

        {showGuide && (
          <div className="fixed inset-0 bg-slate-950/95 z-[200] p-8 flex flex-col items-center justify-center space-y-6 overflow-y-auto">
             <div className="w-16 h-1 bg-slate-800 rounded-full mb-4"></div>
             <h3 className="text-2xl font-black uppercase italic">Uno Rules</h3>
             <div className="text-left space-y-4 text-sm text-slate-400">
                <div className="flex gap-4 items-start bg-slate-900 p-4 rounded-2xl">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-white">1</div>
                   <p>Match cards by <span className="text-white font-bold">Color</span> or <span className="text-white font-bold">Value</span> (e.g., Red 5 on Blue 5).</p>
                </div>
                <div className="flex gap-4 items-start bg-slate-900 p-4 rounded-2xl">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-white">2</div>
                   <p><span className="text-indigo-400 font-bold italic">Wild Cards</span> can be played on anything and let you choose a new active color.</p>
                </div>
                <div className="flex gap-4 items-start bg-slate-900 p-4 rounded-2xl">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-white">3</div>
                   <p><span className="text-red-500 font-bold">Skip</span> stops the next player. <span className="text-blue-500 font-bold">Reverse</span> changes turn order.</p>
                </div>
                <div className="flex gap-4 items-start bg-slate-900 p-4 rounded-2xl">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center font-black text-white">4</div>
                   <p>Press <span className="text-amber-500 font-bold uppercase">Uno!</span> when you have only 1 card left, or draw 2 penalty cards!</p>
                </div>
             </div>
             <button onClick={() => setShowGuide(false)} className="w-full bg-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Got it!</button>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'passing') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 bg-slate-950">
        <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center animate-pulse">
           <i className="fa-solid fa-mobile-screen text-indigo-500 text-6xl"></i>
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase italic">Pass the Phone</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Next up: Player {turn + 1}</p>
        </div>
        <button 
          onClick={() => setGameState('playing')}
          className="w-full bg-indigo-600 py-5 rounded-[2rem] font-black text-xl"
        >
          I'M READY
        </button>
      </div>
    );
  }

  // Which hand to show at the bottom?
  // In VS Computer, always show Player 0's hand.
  // In Pass & Play, show the current turn's hand.
  const displayHand = mode === 'computer' ? hands[0] : hands[turn];
  const isMyTurn = mode === 'computer' ? (turn === 0) : true;

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4 gap-4 overflow-hidden relative">
      {/* Table Top */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900/30 rounded-[3.5rem] border-4 border-slate-800/50 shadow-inner">
        
        {/* Opponents Icons */}
        <div className="absolute top-8 flex gap-6">
          {hands.map((h, i) => (mode === 'computer' || i !== turn) && (
            <div key={i} className={`flex flex-col items-center gap-1 transition-all ${turn === i ? 'scale-110' : 'opacity-40'}`}>
               <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${turn === i ? 'bg-indigo-600 border-white' : 'bg-slate-800 border-slate-700'}`}>
                    <i className={`fa-solid ${mode === 'computer' && i !== 0 ? 'fa-robot' : 'fa-user'} text-sm`}></i>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">{h.length}</div>
               </div>
               <span className="text-[8px] font-black uppercase text-slate-500">{mode === 'computer' && i !== 0 ? `Bot ${i}` : `P${i+1}`}</span>
            </div>
          ))}
        </div>
        
        {/* Draw and Discard Piles */}
        <div className="flex items-center gap-10">
          <div 
            onClick={() => isMyTurn && drawCard(turn)} 
            className={`
              w-24 h-32 bg-slate-800 border-4 rounded-3xl flex items-center justify-center shadow-2xl cursor-pointer active:scale-95 transition-all
              ${isMyTurn ? 'border-indigo-500/50' : 'border-slate-700 opacity-50'}
            `}
          >
             <div className="text-center">
               <i className="fa-solid fa-plus text-indigo-400 text-3xl mb-1"></i>
               <p className="text-[8px] font-black text-indigo-400 uppercase">Draw</p>
             </div>
          </div>

          <div className="relative">
            <div className={`absolute -inset-8 rounded-full blur-3xl opacity-30 animate-pulse ${COLORS[activeColor]}`} />
            {discardPile.length > 0 && renderCard(discardPile[discardPile.length - 1])}
            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-xl ${COLORS[activeColor]}`}>
              {activeColor}
            </div>
          </div>
        </div>

        {/* Pot */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl text-right">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Prize Pool</p>
          <p className="text-lg font-black text-amber-500">${pot}</p>
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-2xl border border-slate-800">
         <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <p className="text-xs font-black text-slate-300 uppercase italic">
              {isMyTurn ? "Your turn!" : `Bot ${turn} is thinking...`}
            </p>
         </div>
         <button 
           onClick={() => {
             const copy = [...unoCalled];
             copy[turn] = true;
             setUnoCalled(copy);
             soundService.playWin();
           }}
           className={`
            px-6 py-2 rounded-full font-black text-sm uppercase tracking-tighter transition-all border-2
            ${displayHand.length === 2 && isMyTurn ? 'bg-red-600 border-white animate-bounce shadow-xl shadow-red-600/40' : 'bg-slate-800 border-slate-700 text-slate-600'}
           `}
         >
           Uno!
         </button>
      </div>

      {/* Current Player Hand */}
      <div className="h-44 flex items-end justify-center px-4 pb-4 overflow-x-auto custom-scrollbar">
        <div className="flex -space-x-12 pb-4">
          {displayHand?.map((c, i) => {
            const playable = isMyTurn && isValidPlay(c);
            return (
              <div key={c.id} className="transition-all hover:z-50" style={{ transform: `rotate(${(i - displayHand.length/2) * 4}deg)` }}>
                {renderCard(c, () => isMyTurn && playCard(c, turn), false, playable)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Color Picker Overlay */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
           <div className="bg-slate-900 border-4 border-slate-800 p-8 rounded-[3.5rem] w-full max-w-xs text-center space-y-8 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Wild Choice</h3>
              <div className="grid grid-cols-2 gap-4">
                {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map(c => (
                  <button 
                    key={c} 
                    onClick={() => { setShowColorPicker(false); if (pendingWild) applyEffects(pendingWild, c, turn); }} 
                    className={`w-full aspect-square rounded-[2rem] ${COLORS[c]} border-4 border-white/20 shadow-xl active:scale-90 transition-transform`} 
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Pick a color for the next play!</p>
           </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-12 text-center animate-in zoom-in">
           <div className="space-y-8">
              <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40 border-4 border-white rotate-12">
                <i className="fa-solid fa-trophy text-white text-4xl"></i>
              </div>
              <div>
                <h2 className="text-5xl font-black italic uppercase italic tracking-tighter mb-2">Match Over!</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm">Thanks for playing UNO PRO</p>
              </div>
              <button 
                onClick={() => onGameOver(0)} 
                className="w-full bg-indigo-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-600/40 active:scale-95 transition-transform"
              >
                RETURN LOBBY
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UnoGame;
