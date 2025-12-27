
import React, { useState, useEffect, useCallback } from 'react';
import { soundService } from '../services/soundService';

type CardSuit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: CardSuit;
  value: CardValue;
  rank: number;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  balance: number;
  bet: number;
  isFolded: boolean;
  isBlind: boolean;
  isBot: boolean;
  lastAction?: string;
}

const SUITS: CardSuit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
const VALUES: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const VALUE_RANKS: Record<CardValue, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const TeenPatti: React.FC<{ entryFee: number; onGameOver: (tokens: number) => void }> = ({ entryFee, onGameOver }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'showdown'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [pot, setPot] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [currentStake, setCurrentStake] = useState(10);
  const [showGuide, setShowGuide] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");
  const [startSeen, setStartSeen] = useState(false);

  const createDeck = () => {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        newDeck.push({ suit, value, rank: VALUE_RANKS[value] });
      });
    });
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const getHandRankInfo = (hand: Card[]) => {
    const ranks = [...hand].map(c => c.rank).sort((a, b) => a - b);
    const suits = hand.map(c => c.suit);
    const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
    const isPureSeq = (ranks[2] - ranks[1] === 1 && ranks[1] - ranks[0] === 1) && (suits[0] === suits[1] && suits[1] === suits[2]);
    const isSeq = (ranks[2] - ranks[1] === 1 && ranks[1] - ranks[0] === 1);
    const isColor = suits[0] === suits[1] && suits[1] === suits[2];
    const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

    if (isTrail) return { rank: 600 + ranks[0], name: "Trail (Set)" };
    if (isPureSeq) return { rank: 500 + ranks[2], name: "Pure Sequence" };
    if (isSeq) return { rank: 400 + ranks[2], name: "Sequence" };
    if (isColor) return { rank: 300 + ranks[2], name: "Color" };
    if (isPair) {
      const pairRank = (ranks[0] === ranks[1]) ? ranks[0] : (ranks[1] === ranks[2] ? ranks[1] : ranks[0]);
      return { rank: 200 + pairRank, name: "Pair" };
    }
    return { rank: 100 + ranks[2], name: "High Card" };
  };

  const startGame = () => {
    const newDeck = createDeck();
    const initialPlayers: Player[] = [
      { id: 'player', name: 'You', hand: [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!], balance: 1000, bet: entryFee, isFolded: false, isBlind: !startSeen, isBot: false },
      { id: 'bot1', name: 'Arjun', hand: [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!], balance: 1000, bet: entryFee, isFolded: false, isBlind: true, isBot: true },
      { id: 'bot2', name: 'Priya', hand: [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!], balance: 1000, bet: entryFee, isFolded: false, isBlind: true, isBot: true },
    ];
    setPlayers(initialPlayers);
    setPot(entryFee * initialPlayers.length);
    setCurrentStake(entryFee);
    setCurrentTurn(0);
    setGameState('playing');
    setWinnerMessage("");
    soundService.playClick();
  };

  const handleMove = (type: 'chaal' | 'fold' | 'show' | 'seen' | 'raise' | 'decrease', playerIdx: number) => {
    if (playerIdx !== currentTurn && type !== 'raise' && type !== 'decrease') return;
    
    let nextPlayers = [...players];
    const p = nextPlayers[playerIdx];

    if (type === 'seen') {
      nextPlayers[playerIdx].isBlind = false;
      nextPlayers[playerIdx].lastAction = "Seen";
      setPlayers(nextPlayers);
      soundService.playTab();
      return;
    }

    if (type === 'raise') {
      setCurrentStake(prev => Math.min(prev * 2, 200));
      soundService.playClick();
      return;
    }

    if (type === 'decrease') {
      setCurrentStake(prev => Math.max(prev / 2, entryFee));
      soundService.playClick();
      return;
    }

    if (type === 'fold') {
      nextPlayers[playerIdx].isFolded = true;
      nextPlayers[playerIdx].lastAction = "Folded";
      soundService.playCapture();
    } else if (type === 'chaal') {
      const betAmount = p.isBlind ? currentStake : currentStake * 2;
      nextPlayers[playerIdx].bet += betAmount;
      nextPlayers[playerIdx].lastAction = "Chaal";
      setPot(prev => prev + betAmount);
      soundService.playMove();
    } else if (type === 'show') {
      soundService.playWin();
      determineWinner();
      return;
    }

    setPlayers(nextPlayers);
    const active = nextPlayers.filter(pl => !pl.isFolded);
    if (active.length === 1) {
      setWinnerMessage(`${active[0].name} Wins by default!`);
      setGameState('showdown');
      setTimeout(() => onGameOver(active[0].id === 'player' ? pot : 0), 2000);
      return;
    }

    let nextT = (playerIdx + 1) % players.length;
    while (nextPlayers[nextT].isFolded) nextT = (nextT + 1) % players.length;
    setCurrentTurn(nextT);
  };

  const determineWinner = () => {
    const active = players.filter(p => !p.isFolded);
    let best = active[0];
    active.forEach(p => {
      if (getHandRankInfo(p.hand).rank > getHandRankInfo(best.hand).rank) best = p;
    });
    const handName = getHandRankInfo(best.hand).name;
    setWinnerMessage(`${best.name} wins with ${handName}!`);
    setGameState('showdown');
    setTimeout(() => onGameOver(best.id === 'player' ? pot : 0), 3500);
  };

  useEffect(() => {
    if (gameState === 'playing' && players[currentTurn]?.isBot) {
      const bot = players[currentTurn];
      const timer = setTimeout(() => {
        const chance = Math.random();
        if (bot.isBlind && chance > 0.6) {
          handleMove('seen', currentTurn);
        } else {
          const handInfo = getHandRankInfo(bot.hand);
          if (!bot.isBlind && handInfo.rank < 110 && chance < 0.3) handleMove('fold', currentTurn);
          else if (handInfo.rank > 350 && chance > 0.9) handleMove('raise', currentTurn);
          else handleMove('chaal', currentTurn);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, gameState, players, currentStake]);

  const renderCard = (card: Card, isHidden: boolean, size: 'sm' | 'lg' = 'sm') => {
    const cardClass = size === 'lg' 
      ? "w-20 h-32 rounded-2xl text-2xl" 
      : "w-12 h-18 rounded-lg text-xs";
    
    return (
      <div className={`${cardClass} flex flex-col items-center justify-center border-2 shadow-xl transition-all duration-300 ${isHidden ? 'bg-emerald-900 border-emerald-700' : 'bg-white border-white text-slate-900'}`}>
        {!isHidden ? (
          <>
            <span className="font-black leading-none">{card.value}</span>
            <i className={`fa-solid fa-${card.suit.slice(0,-1)} ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}></i>
          </>
        ) : (
          <i className="fa-solid fa-om text-white/20 text-3xl"></i>
        )}
      </div>
    );
  };

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950">
        <div className="w-32 h-32 bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-8 border-4 border-white/10 animate-pulse">
           <i className="fa-solid fa-cards text-6xl text-white"></i>
        </div>
        <h2 className="text-5xl font-black italic uppercase text-white mb-2 tracking-tighter">Teen Patti</h2>
        <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.4em] mb-10">Traditional Card Battle</p>
        
        <div className="w-full max-w-xs space-y-4">
           <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Initial Preference</p>
              <button 
                onClick={() => { soundService.playClick(); setStartSeen(!startSeen); }}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase border-2 transition-all ${startSeen ? 'bg-indigo-600 border-white text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              >
                {startSeen ? 'Starting SEEN' : 'Starting BLIND'}
              </button>
           </div>
           
           <button 
             onClick={startGame} 
             className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl text-white active:scale-95 transition-all"
           >
             PLAY NOW
           </button>
        </div>
      </div>
    );
  }

  const myPlayer = players[0];
  const myHandInfo = getHandRankInfo(myPlayer?.hand || []);

  return (
    <div className="flex flex-col h-full bg-[#072519] relative overflow-hidden font-sans">
      {/* 1. ARENA (Table View) */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        {/* Table Felt Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Pot Display */}
        <div className="relative z-10 bg-black/60 backdrop-blur-3xl border border-white/10 px-8 py-5 rounded-[2.5rem] text-center shadow-2xl scale-110 mb-20">
           <p className="text-[8px] font-black uppercase text-emerald-400 tracking-[0.5em] mb-1">Total Pot</p>
           <h3 className="text-5xl font-black text-white italic tracking-tighter">${pot}</h3>
           {winnerMessage && (
             <div className="mt-4 animate-bounce">
                <span className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full font-black text-[10px] uppercase shadow-xl">{winnerMessage}</span>
             </div>
           )}
        </div>

        {/* Opponents & You on Table */}
        <div className="absolute inset-0 p-8">
           {players.map((p, idx) => {
              const isActive = currentTurn === idx;
              const isMe = idx === 0;
              // Circle layout
              const angles = [90, 210, 330];
              const angle = angles[idx];
              const dist = 38; // percent

              return (
                <div 
                  key={p.id} 
                  className={`absolute flex flex-col items-center gap-2 transition-all duration-500 ${p.isFolded ? 'opacity-20 grayscale' : 'opacity-100'}`}
                  style={{ top: `${50 - Math.sin(angle * Math.PI / 180) * dist}%`, left: `${50 + Math.cos(angle * Math.PI / 180) * dist}%`, transform: 'translate(-50%, -50%)' }}
                >
                   {/* Avatar */}
                   <div className="relative">
                      <div className={`w-14 h-14 rounded-full border-4 ${isActive ? 'border-amber-400 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'border-slate-800'} overflow-hidden bg-slate-800`}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full" alt={p.name} />
                      </div>
                      {p.lastAction && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 text-[6px] font-black uppercase px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                          {p.lastAction}
                        </div>
                      )}
                      {p.isBlind && !p.isFolded && (
                        <div className="absolute -top-1 -right-4 bg-red-600 text-[6px] font-black px-1.5 py-0.5 rounded-sm uppercase text-white rotate-12">Blind</div>
                      )}
                   </div>
                   
                   <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.name}</p>
                      <p className="text-xs font-black text-amber-500">${p.bet}</p>
                   </div>

                   {/* Cards on table (small) */}
                   <div className="flex -space-x-3">
                      {p.hand.map((_, cIdx) => (
                        <div key={cIdx} className="w-5 h-7 bg-emerald-950 border border-emerald-800 rounded shadow-lg transform rotate-[-10deg]" />
                      ))}
                   </div>
                </div>
              );
           })}
        </div>
      </div>

      {/* 2. DASHBOARD (Your UI Area) */}
      <div className="relative z-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 p-6 space-y-5 pb-10">
         
         {/* Your Hand Display - THE DASHBOARD */}
         <div className="flex flex-col items-center gap-3">
            <div className="flex justify-between w-full items-center px-2">
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Cards</span>
               {!myPlayer.isBlind && <span className="text-[10px] font-black uppercase text-emerald-400 italic">Rank: {myHandInfo.name}</span>}
            </div>
            
            <div className="flex gap-4 items-center justify-center p-4 bg-white/5 rounded-3xl border border-white/10 w-full relative">
               {myPlayer.hand.map((c, i) => (
                 <div key={i} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                   {renderCard(c, myPlayer.isBlind && gameState !== 'showdown', 'lg')}
                 </div>
               ))}
               
               {myPlayer.isBlind && (
                 <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <button 
                      onClick={() => handleMove('seen', 0)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase shadow-xl active:scale-95 border border-white/20"
                    >
                      SEE CARDS
                    </button>
                 </div>
               )}
            </div>
         </div>

         {/* Betting Control Row */}
         <div className="flex items-center justify-between bg-white/5 p-4 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-3">
               <button onClick={() => handleMove('decrease', 0)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700"><i className="fa-solid fa-minus"></i></button>
               <div className="text-center min-w-[80px]">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Current Stake</p>
                  <p className="text-xl font-black text-white">${currentStake}</p>
               </div>
               <button onClick={() => handleMove('raise', 0)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700"><i className="fa-solid fa-plus"></i></button>
            </div>
            
            <div className="text-right">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Bet Required</p>
               <p className="text-lg font-black text-emerald-400">${myPlayer.isBlind ? currentStake : currentStake * 2}</p>
            </div>
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-2 gap-4">
            {currentTurn === 0 && gameState === 'playing' ? (
              <>
                <button 
                  onClick={() => handleMove('fold', 0)} 
                  className="bg-red-600/10 text-red-500 border border-red-500/20 py-5 rounded-2xl font-black uppercase text-xs active:bg-red-600/20"
                >
                  FOLD
                </button>
                <button 
                  onClick={() => handleMove('chaal', 0)} 
                  className="bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 border border-white/10"
                >
                  CHAAL
                </button>
                {!myPlayer.isBlind && (
                  <button 
                    onClick={() => handleMove('show', 0)} 
                    className="col-span-2 bg-amber-500 text-slate-950 py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95"
                  >
                    SHOWDOWN (SIDESHOW)
                  </button>
                )}
              </>
            ) : (
              <div className="col-span-2 py-5 text-center bg-white/5 rounded-2xl border border-white/5 italic">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] animate-pulse">
                   Waiting for {players[currentTurn]?.name}...
                 </p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default TeenPatti;
