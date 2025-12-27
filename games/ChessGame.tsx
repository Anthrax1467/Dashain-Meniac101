
import React, { useState, useEffect, useRef } from 'react';
import { soundService } from '../services/soundService';
import { getChessCoachAdvice, getAdvancedBotMove, getCheckmateProclamation } from '../services/geminiService';
import { Chess, Square as ChessSquareType } from 'https://esm.sh/chess.js@1.0.0-beta.8';

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const PIECE_ICONS: Record<string, string> = {
  p: 'fa-chess-pawn',
  n: 'fa-chess-knight',
  b: 'fa-chess-bishop',
  r: 'fa-chess-rook',
  q: 'fa-chess-queen',
  k: 'fa-chess-king',
};

const COLOR_CLASSES: Record<string, string> = {
  w: 'text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]',
  b: 'text-slate-900 drop-shadow-[0_0_1px_rgba(255,255,255,0.5)]',
};

const ChessGame: React.FC<{ entryFee: number; onGameOver: (tokens: number) => void }> = ({ entryFee, onGameOver }) => {
  const [game, setGame] = useState(new Chess());
  const [mode, setMode] = useState<'setup' | 'classic'>('setup');
  const [selected, setSelected] = useState<ChessSquareType | null>(null);
  const [isBot, setIsBot] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");
  const [checkmateSpeech, setCheckmateSpeech] = useState("");
  const [coachAdvice, setCoachAdvice] = useState<string>("");
  const [botLogic, setBotLogic] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const initClassicBoard = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMode('classic');
    setWinnerMessage("");
    setCheckmateSpeech("");
  };

  const handleSquareClick = (square: ChessSquareType) => {
    if (winnerMessage || isAnalyzing) return;
    if (isBot && game.turn() === 'b') return;

    if (selected) {
      try {
        const move = game.move({ from: selected, to: square, promotion: 'q' });
        if (move) {
          soundService.playMove();
          if (move.captured) soundService.playCapture();
          setSelected(null);
          setGame(new Chess(game.fen()));
          checkGameOver();
          return;
        }
      } catch (e) {}
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      soundService.playClick();
    } else {
      setSelected(null);
    }
  };

  const checkGameOver = async () => {
    if (game.isGameOver()) {
      let msg = "Game Over!";
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      if (game.isCheckmate()) {
        msg = `CHECKMATE! ${winner} WINS`;
        soundService.playWin();
        setIsAnalyzing(true);
        const speech = await getCheckmateProclamation(winner, game.fen());
        setCheckmateSpeech(speech);
        setIsAnalyzing(false);
      }
      setWinnerMessage(msg);
    }
  };

  useEffect(() => {
    if (isBot && game.turn() === 'b' && !game.isGameOver() && mode === 'classic') {
      const playAiMove = async () => {
        setIsAnalyzing(true);
        const moveData = await getAdvancedBotMove(game.fen(), 'black');
        if (moveData && moveData.from && moveData.to) {
          try {
            game.move({ from: moveData.from, to: moveData.to, promotion: 'q' });
            setBotLogic(moveData.logic);
            soundService.playMove();
            setGame(new Chess(game.fen()));
            checkGameOver();
          } catch (e) {
            playFallbackMove();
          }
        } else {
          playFallbackMove();
        }
        setIsAnalyzing(false);
      };
      setTimeout(playAiMove, 800);
    }
  }, [game.turn()]);

  const playFallbackMove = () => {
    const moves = game.moves();
    if (moves.length > 0) {
      game.move(moves[Math.floor(Math.random() * moves.length)]);
      setGame(new Chess(game.fen()));
      checkGameOver();
    }
  };

  if (mode === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a14]">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 border-4 border-slate-900">
          <i className="fa-solid fa-chess text-4xl text-white"></i>
        </div>
        <h2 className="text-4xl font-black italic uppercase text-white mb-8 tracking-tighter">Royal Chess</h2>
        <div className="w-full max-w-xs space-y-4">
           <button onClick={() => { setIsBot(true); initClassicBoard(); }} className="w-full bg-slate-900 py-6 rounded-2xl font-black text-xs uppercase text-white border-2 border-slate-800">VS Neural Grandmaster</button>
           <button onClick={() => { setIsBot(false); initClassicBoard(); }} className="w-full bg-slate-900 py-6 rounded-2xl font-black text-xs uppercase text-white border-2 border-slate-800">Local 1v1</button>
        </div>
      </div>
    );
  }

  const boardArray = game.board();

  return (
    <div className="flex flex-col h-full bg-[#0a0a14] relative overflow-hidden font-sans">
      <div className="p-4 bg-black/80 border-b border-white/10 flex justify-between items-center z-50">
        <div className="flex flex-col">
           <p className="text-[8px] font-black uppercase text-slate-500">TURN</p>
           <span className="text-xs font-black uppercase text-white">{game.turn() === 'w' ? 'White' : 'Black'}</span>
        </div>
        <button onClick={() => setMode('setup')} className="px-4 py-2 bg-red-600/10 text-red-500 text-[10px] font-black uppercase rounded-full">Exit</button>
      </div>

      <div className="flex-1 flex items-center justify-center p-2">
         <div className="grid shadow-2xl border-[6px] border-slate-900 rounded-xl overflow-hidden bg-slate-800" style={{ gridTemplateColumns: `repeat(8, 1fr)`, width: '100%', maxWidth: '380px', aspectRatio: '1/1' }}>
           {boardArray.map((row, r) => row.map((piece, c) => {
             const squareCoord = `${String.fromCharCode(97 + c)}${8 - r}` as ChessSquareType;
             const isLight = (r + c) % 2 === 0;
             const isSelected = selected === squareCoord;
             const isValidMove = selected ? game.moves({ square: selected, verbose: true }).some(m => m.to === squareCoord) : false;

             return (
               <div key={squareCoord} onClick={() => handleSquareClick(squareCoord)} className={`relative flex items-center justify-center transition-all cursor-pointer ${isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'} ${isSelected ? 'ring-inset ring-4 ring-amber-400' : ''}`}>
                 {piece && <i className={`fa-solid ${PIECE_ICONS[piece.type]} text-3xl z-10 ${COLOR_CLASSES[piece.color]}`}></i>}
                 {isValidMove && <div className="absolute w-3 h-3 bg-indigo-600/40 rounded-full" />}
               </div>
             );
           }))}
         </div>
      </div>

      {winnerMessage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[300] flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-4xl font-black uppercase italic text-white mb-6">{winnerMessage}</h2>
          <p className="text-indigo-100 text-sm italic mb-10 px-8">"{checkmateSpeech || "Strategic conclusion achieved."}"</p>
          <button onClick={() => onGameOver(game.turn() === 'b' ? entryFee * 2 : 0)} className="w-full max-w-xs bg-indigo-600 py-6 rounded-[2.5rem] font-black text-xl">CLAIM VICTORY</button>
        </div>
      )}
    </div>
  );
};

export default ChessGame;
