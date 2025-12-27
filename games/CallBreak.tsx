
import React, { useState, useEffect, useCallback } from 'react';
import { soundService } from '../services/soundService';

type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2 to 14
}

interface Player {
  id: number;
  name: string;
  hand: Card[];
  bid: number;
  tricks: number;
  score: number;
  isBot: boolean;
}

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const CallBreak: React.FC<{ entryFee: number; onGameOver: (tokens: number) => void }> = ({ entryFee, onGameOver }) => {
  const [gameState, setGameState] = useState<'setup' | 'bidding' | 'playing' | 'roundSummary' | 'gameOver'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [turn, setTurn] = useState(0); // Index of player whose turn it is
  const [trickCards, setTrickCards] = useState<(Card | null)[]>(Array(4).fill(null));
  const [firstPlayerOfTrick, setFirstPlayerOfTrick] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [winningMessage, setWinningMessage] = useState<string | null>(null);

  const createDeck = () => {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
      RANKS.forEach((rank, i) => {
        deck.push({ suit, rank, value: i + 2 });
      });
    });
    return deck.sort(() => Math.random() - 0.5);
  };

  const initRound = useCallback(() => {
    const deck = createDeck();
    const existingPlayers = players.length > 0 ? players : [
      { id: 0, name: 'You', hand: [], bid: 0, tricks: 0, score: 0, isBot: false },
      { id: 1, name: 'Bot Arjun', hand: [], bid: 0, tricks: 0, score: 0, isBot: true },
      { id: 2, name: 'Bot Priya', hand: [], bid: 0, tricks: 0, score: 0, isBot: true },
      { id: 3, name: 'Bot Rohan', hand: [], bid: 0, tricks: 0, score: 0, isBot: true }
    ];

    const newPlayers = existingPlayers.map((p, idx) => {
      const hand = deck.slice(idx * 13, (idx + 1) * 13).sort((a, b) => {
        if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        return b.value - a.value;
      });
      return { ...p, hand, bid: 0, tricks: 0 };
    });

    setPlayers(newPlayers);
    setGameState('bidding');
    setTurn(0);
    setTrickCards(Array(4).fill(null));
    setFirstPlayerOfTrick((currentRound - 1) % 4); // Rotate who starts each round
  }, [players, currentRound]);

  const handleBid = (bidValue: number, playerIdx: number) => {
    const newPlayers = [...players];
    newPlayers[playerIdx].bid = bidValue;
    setPlayers(newPlayers);
    soundService.playClick();

    if (playerIdx < 3) {
      const nextIdx = playerIdx + 1;
      // Bot Bidding logic: estimate based on high cards and spades
      const botHand = newPlayers[nextIdx].hand;
      const spadesCount = botHand.filter(c => c.suit === 'spades').length;
      const highCards = botHand.filter(c => c.value >= 12).length;
      const estimate = Math.max(1, Math.min(8, Math.floor((spadesCount + highCards) / 1.5)));
      
      setTimeout(() => handleBid(estimate, nextIdx), 600);
    } else {
      setGameState('playing');
      setTurn((currentRound - 1) % 4);
      setFirstPlayerOfTrick((currentRound - 1) % 4);
    }
  };

  const isPlayable = (card: Card, playerIdx: number) => {
    const hand = players[playerIdx].hand;
    const leadCard = trickCards[firstPlayerOfTrick];
    
    if (!leadCard) return true; // First player can play anything

    const hasLeadSuit = hand.some(c => c.suit === leadCard.suit);
    if (hasLeadSuit) {
        // If has lead suit, must play lead suit
        return card.suit === leadCard.suit;
    }

    const hasSpades = hand.some(c => c.suit === 'spades');
    if (hasSpades) {
        // If doesn't have lead suit but has spades, must play spade (Trump)
        return card.suit === 'spades';
    }

    // Otherwise anything is fine
    return true;
  };

  const playCard = (card: Card, playerIdx: number) => {
    if (playerIdx !== turn) return;
    if (!isPlayable(card, playerIdx)) return;

    const newTrickCards = [...trickCards];
    newTrickCards[playerIdx] = card;
    setTrickCards(newTrickCards);

    const newPlayers = [...players];
    newPlayers[playerIdx].hand = newPlayers[playerIdx].hand.filter(c => c !== card);
    setPlayers(newPlayers);
    soundService.playMove();

    const nextTurn = (playerIdx + 1) % 4;
    if (nextTurn === firstPlayerOfTrick) {
      // Trick finished
      setTimeout(() => evaluateTrick(newTrickCards), 1000);
    } else {
      setTurn(nextTurn);
    }
  };

  const evaluateTrick = (cards: (Card | null)[]) => {
    const leadSuit = cards[firstPlayerOfTrick]!.suit;
    let winningPlayer = firstPlayerOfTrick;
    let winningCard = cards[firstPlayerOfTrick]!;

    cards.forEach((card, idx) => {
      if (!card) return;
      // Trump rules
      if (card.suit === 'spades' && winningCard.suit !== 'spades') {
        winningCard = card;
        winningPlayer = idx;
      } else if (card.suit === winningCard.suit && card.value > winningCard.value) {
        winningCard = card;
        winningPlayer = idx;
      }
    });

    const newPlayers = [...players];
    newPlayers[winningPlayer].tricks += 1;
    setPlayers(newPlayers);
    soundService.playWin();

    setTrickCards(Array(4).fill(null));
    
    if (newPlayers[0].hand.length === 0) {
      setTimeout(endRound, 1000);
    } else {
      setTurn(winningPlayer);
      setFirstPlayerOfTrick(winningPlayer);
    }
  };

  const endRound = () => {
    const newPlayers = players.map(p => {
      const diff = p.tricks - p.bid;
      // Standard Call Break scoring: if made bid, score = bid + extra/10. Else, score = -bid.
      const roundScore = diff >= 0 ? p.bid + (diff * 0.1) : -p.bid;
      return { ...p, score: parseFloat((p.score + roundScore).toFixed(1)) };
    });
    setPlayers(newPlayers);
    
    if (currentRound >= 5) {
      setGameState('gameOver');
      const winner = [...newPlayers].sort((a, b) => b.score - a.score)[0];
      setWinningMessage(`${winner.name} Wins the Championship!`);
    } else {
      setGameState('roundSummary');
    }
  };

  // Bot Logic
  useEffect(() => {
    if (gameState === 'playing' && players[turn]?.isBot && !trickCards[turn]) {
      const botIdx = turn;
      setTimeout(() => {
        const botHand = players[botIdx].hand;
        const playableCards = botHand.filter(c => isPlayable(c, botIdx));
        // Simple bot strategy: try to win or throw away small
        const leadCard = trickCards[firstPlayerOfTrick];
        let chosen = playableCards[0];
        if (leadCard) {
            // Try to play just higher than lead
            const betterCards = playableCards.filter(c => c.suit === leadCard.suit && c.value > leadCard.value);
            if (betterCards.length > 0) chosen = betterCards[betterCards.length - 1]; // Play smallest winner
            else chosen = playableCards[playableCards.length - 1]; // Play smallest overall
        }
        playCard(chosen, botIdx);
      }, 1000);
    }
  }, [turn, gameState, trickCards]);

  if (gameState === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-indigo-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-slate-900 ring-4 ring-indigo-500/20">
           <i className="fa-solid fa-heart-crack text-4xl text-white"></i>
        </div>
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter glitch-text">Call Break</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Spades are the Trump Cards</p>
        </div>
        <button 
          onClick={() => { soundService.playClick(); initRound(); }} 
          className="w-full bg-indigo-600 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-600/40 active:scale-95 transition-all"
        >
          START 5-ROUND MATCH
        </button>
        <button onClick={() => setShowGuide(true)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Game Rules</button>
        
        {showGuide && (
          <div className="fixed inset-0 bg-slate-950/98 z-[200] p-8 flex flex-col items-center justify-center overflow-y-auto">
             <h3 className="text-2xl font-black italic uppercase text-center mb-6">Call Break Pro</h3>
             <div className="space-y-4 max-w-sm text-sm text-slate-400 leading-relaxed">
                <p>1. <span className="text-white font-bold">Spades</span> are permanent Trump cards. They beat any other suit.</p>
                <p>2. You <span className="text-white font-bold">must follow suit</span> if possible. If you can't, you must play a Spade.</p>
                <p>3. If you have neither the lead suit nor a Spade, any card can be played.</p>
                <p>4. <span className="text-indigo-400 font-bold italic">Bidding:</span> You call how many tricks you can win. Winning fewer results in a negative score of that bid.</p>
                <p>5. Match consists of 5 rounds. Highest total score wins!</p>
             </div>
             <button onClick={() => setShowGuide(false)} className="w-full bg-indigo-600 py-4 rounded-2xl mt-10 font-black uppercase text-xs">I'm Ready</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#11221b] p-4 relative overflow-hidden font-sans">
      {/* Table Top UI */}
      <div className="flex justify-between items-center mb-4 px-2">
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Round</span>
            <span className="text-lg font-black text-white">{currentRound} / 5</span>
         </div>
         <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trump Suit</span>
            <span className="text-indigo-400"><i className="fa-solid fa-spade"></i> SPADES</span>
         </div>
      </div>

      <div className="flex-1 relative bg-black/20 rounded-[3rem] border-4 border-white/5 shadow-inner">
        {players.map((p, idx) => {
          // Positions: 0: Bottom (User), 1: Left, 2: Top, 3: Right
          const posStyles: React.CSSProperties[] = [
            { bottom: '2rem', left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', left: '1.5rem', transform: 'translateY(-50%) rotate(90deg)' },
            { top: '2rem', left: '50%', transform: 'translateX(-50%) rotate(180deg)' },
            { top: '50%', right: '1.5rem', transform: 'translateY(-50%) rotate(-90deg)' }
          ];
          
          const cardStyles: React.CSSProperties[] = [
            { bottom: '6rem', left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', left: '8rem', transform: 'translateY(-50%)' },
            { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', right: '8rem', transform: 'translateY(-50%)' }
          ];

          return (
            <React.Fragment key={p.id}>
              {/* Player Avatar and Stats */}
              <div 
                className={`absolute flex flex-col items-center gap-1 z-20 transition-all duration-500 ${turn === idx ? 'scale-110 opacity-100' : 'opacity-60 scale-95'}`}
                style={posStyles[idx]}
              >
                <div className={`w-12 h-12 rounded-full border-4 ${turn === idx ? 'border-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-slate-800'} overflow-hidden bg-slate-800`}>
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-full h-full" alt={p.name} />
                </div>
                <div className="bg-black/60 px-2 py-0.5 rounded-full text-center border border-white/10 min-w-[70px]">
                   <p className="text-[8px] font-black uppercase text-white truncate">{p.name}</p>
                   <p className="text-[10px] font-black text-amber-500">{p.tricks} / {p.bid || '?'}</p>
                </div>
              </div>

              {/* Played Card for this player */}
              {trickCards[idx] && (
                <div 
                  className="absolute w-12 h-18 bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center text-slate-900 border-2 border-slate-200 z-10 animate-in zoom-in slide-in-from-bottom-2 duration-300"
                  style={cardStyles[idx]}
                >
                  <span className="text-xs font-black">{trickCards[idx]?.rank}</span>
                  <i className={`fa-solid fa-${trickCards[idx]?.suit.slice(0,-1)} text-xs ${['hearts', 'diamonds'].includes(trickCards[idx]?.suit!) ? 'text-red-500' : 'text-slate-900'}`}></i>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Center Prompt */}
        {!winningMessage && gameState === 'playing' && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Live Arena</p>
              {turn !== 0 && <p className="text-indigo-400 font-bold text-xs animate-pulse italic">{players[turn].name} is thinking...</p>}
           </div>
        )}
      </div>

      {/* User Interaction Zones */}
      {gameState === 'bidding' && turn === 0 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
           <div className="bg-slate-900 border-4 border-slate-800 p-8 rounded-[3rem] w-full max-w-xs text-center space-y-8 animate-in zoom-in">
              <h4 className="text-xl font-black uppercase italic tracking-tighter">Your Bid</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">How many tricks will you win?</p>
              <div className="grid grid-cols-4 gap-3">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map(b => (
                   <button 
                    key={b} 
                    onClick={() => handleBid(b, 0)} 
                    className="aspect-square bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xl shadow-lg active:scale-90 transition-all"
                   >
                    {b}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Hand Display */}
      <div className="h-44 mt-4 flex items-end justify-center overflow-x-auto custom-scrollbar px-2">
         <div className="flex -space-x-8 pb-4">
           {players[0]?.hand.map((card, i) => {
             const playable = gameState === 'playing' && turn === 0 && isPlayable(card, 0);
             return (
               <div 
                 key={`${card.suit}-${card.rank}`}
                 onClick={() => playable && playCard(card, 0)}
                 className={`
                    relative w-16 h-24 bg-white border-2 rounded-xl flex flex-col items-center justify-center text-slate-900 shadow-xl transition-all cursor-pointer
                    ${playable ? 'border-indigo-500 -translate-y-6 z-50 ring-4 ring-indigo-500/20' : 'border-slate-300 opacity-60 z-10'}
                    hover:scale-110
                 `}
                 style={{ transform: `rotate(${(i - players[0].hand.length / 2) * 2}deg)` }}
               >
                  <span className="absolute top-1 left-2 font-black text-xs">{card.rank}</span>
                  <i className={`fa-solid fa-${card.suit.slice(0,-1)} text-xl ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-500' : 'text-slate-900'}`}></i>
                  <span className="absolute bottom-1 right-2 font-black text-xs rotate-180">{card.rank}</span>
               </div>
             );
           })}
         </div>
      </div>

      {/* Round/Game Summary Overlays */}
      {(gameState === 'roundSummary' || gameState === 'gameOver') && (
        <div className="fixed inset-0 bg-slate-950/95 z-[200] p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
           <div className="w-20 h-20 bg-amber-500 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-2xl rotate-3">
              <i className={`fa-solid ${gameState === 'gameOver' ? 'fa-trophy' : 'fa-list-check'} text-3xl text-slate-950`}></i>
           </div>
           <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-8 glitch-text">
             {gameState === 'gameOver' ? 'Final Standings' : `Round ${currentRound} Complete`}
           </h3>
           <div className="w-full max-w-xs space-y-3 mb-10">
              {players.map(p => (
                <div key={p.id} className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                   <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} className="w-8 h-8 rounded-full" alt="" />
                      <span className="font-bold text-sm text-slate-300">{p.name}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Total Score</p>
                      <span className="font-black text-amber-500">{p.score}</span>
                   </div>
                </div>
              ))}
           </div>
           
           {gameState === 'gameOver' ? (
             <div className="w-full space-y-3">
               <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl mb-6">
                 <p className="text-xs font-bold text-green-400">{winningMessage}</p>
               </div>
               <button 
                // Fix: Use Math.max for winner calculation to avoid type inference issues and fix logical error
                onClick={() => {
                  const maxScore = Math.max(...players.map(p => p.score));
                  onGameOver(players[0].score === maxScore ? entryFee * 3 : 0);
                }} 
                className="w-full bg-indigo-600 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all"
               >
                 COLLECT WINNINGS
               </button>
             </div>
           ) : (
             <button 
              onClick={() => { soundService.playClick(); setCurrentRound(r => r + 1); initRound(); }} 
              className="w-full bg-indigo-600 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all"
             >
               NEXT ROUND
             </button>
           )}
        </div>
      )}
    </div>
  );
};

export default CallBreak;
