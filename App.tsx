
import React, { useState, useEffect } from 'react';
import { GameType, GameMetadata, Transaction, UserProfile, StoreItem, ThemeType } from './types';
import { GAMES } from './constants';
import Layout from './components/Layout';
import WalletView from './components/WalletView';
import StoreView from './components/StoreView';
import AuthView from './components/AuthView';
import AdsView from './components/AdsView';
import DashainScenery from './components/DashainScenery';
import SnakeGame from './games/SnakeGame';
import LangurBurja from './games/LangurBurja';
import LudoGame from './games/LudoGame';
import UnoGame from './games/UnoGame';
import CarromGame from './games/CarromGame';
import TeenPatti from './games/TeenPatti';
import CallBreak from './games/CallBreak';
import ChessGame from './games/ChessGame';
import TetrisGame from './games/TetrisGame';
import { getGameStrategy } from './services/geminiService';
import { soundService } from './services/soundService';

const THEME_PREVIEWS: Record<ThemeType, { name: string; color: string; icon: string }> = {
  dashain: { name: 'Dashain', color: 'bg-red-600', icon: 'fa-fire' },
  everest: { name: 'Everest', color: 'bg-blue-500', icon: 'fa-mountain' },
  kathmandu: { name: 'Kathmandu', color: 'bg-purple-600', icon: 'fa-city' },
  gold: { name: 'Royal Gold', color: 'bg-amber-400', icon: 'fa-crown' },
  neon: { name: 'Cyber Neon', color: 'bg-pink-500', icon: 'fa-bolt' },
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'wallet' | 'profile' | 'ads'>('home');
  const [tokens, setTokens] = useState<number>(1000);
  const [adCredits, setAdCredits] = useState<number>(0);
  const [dailyAdRewards, setDailyAdRewards] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentGame, setCurrentGame] = useState<GameMetadata | null>(null);
  const [aiStrategy, setAiStrategy] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [unlockedThemes, setUnlockedThemes] = useState<ThemeType[]>(['dashain']);

  // Persistence and daily limit reset logic
  useEffect(() => {
    const savedUser = localStorage.getItem('sg_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.unlockedThemes) setUnlockedThemes(parsedUser.unlockedThemes);
    }

    const savedState = localStorage.getItem('sg_wallet_state');
    if (savedState) {
      const { tokens: t, adCredits: ac, dailyAdRewards: dar, lastRewardDate, transactions: txs } = JSON.parse(savedState);
      setTokens(t);
      setAdCredits(ac);
      setTransactions(txs || []);

      const today = new Date().toDateString();
      if (lastRewardDate === today) {
        setDailyAdRewards(dar);
      } else {
        setDailyAdRewards(0);
      }
    }
  }, []);

  // Save state whenever tokens, credits or transactions change
  useEffect(() => {
    if (user) {
      const stateToSave = {
        tokens,
        adCredits,
        dailyAdRewards,
        lastRewardDate: new Date().toDateString(),
        transactions
      };
      localStorage.setItem('sg_wallet_state', JSON.stringify(stateToSave));
      
      const updatedUser = { ...user, unlockedThemes };
      localStorage.setItem('sg_user', JSON.stringify(updatedUser));
    }
  }, [tokens, adCredits, dailyAdRewards, transactions, user, unlockedThemes]);

  const handleTabChange = (tab: 'home' | 'market' | 'wallet' | 'profile' | 'ads') => {
    soundService.playTab();
    setActiveTab(tab);
  };

  const addTransaction = (amount: number, type: Transaction['type'], currency: Transaction['currency'] = 'TOKEN') => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      currency,
      type,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    if (currency === 'TOKEN') {
      setTokens(prev => prev + amount);
    } else if (currency === 'AD_CREDIT') {
      setAdCredits(prev => prev + amount);
      if (type === 'AD_REWARD') {
        setDailyAdRewards(prev => prev + amount);
      }
    }
    setTransactions(prev => [...prev, newTx]);
  };

  const handlePurchase = (item: StoreItem) => {
    if (item.currency === 'USD') {
      if (confirm(`Confirm purchase of ${item.name} for $${item.price}?`)) {
        addTransaction(item.value || 0, 'DEPOSIT', 'TOKEN');
        alert(`Purchase successful! Added ${item.value} Tokens.`);
      }
    } else {
      if (tokens >= item.price) {
        if (confirm(`Unlock ${item.name} for ${item.price} Tokens?`)) {
          addTransaction(-item.price, 'PURCHASE', 'TOKEN');
          if (item.type === 'THEME') {
            const themeId = item.id.replace('theme_', '') as ThemeType;
            setUnlockedThemes(prev => [...new Set([...prev, themeId])]);
          }
          alert(`Successfully unlocked ${item.name}!`);
        }
      } else {
        alert("Insufficient Tokens.");
      }
    }
  };

  const handleRedeem = (amount: number, bankInfo: string) => {
    addTransaction(-amount, 'REDEEM', 'TOKEN');
    console.log(`Redeeming ${amount} tokens to: ${bankInfo}`);
    alert(`Redemption request of ${amount} Tokens sent to processing! Your funds will arrive at the provided account soon.`);
  };

  const handleThemeChange = (theme: ThemeType) => {
    if (!unlockedThemes.includes(theme)) {
      if (confirm(`This theme is locked. Would you like to visit the Market to unlock it?`)) {
        setActiveTab('market');
      }
      return;
    }
    soundService.playClick();
    if (user) {
      const updatedUser = { ...user, currentTheme: theme };
      setUser(updatedUser);
      localStorage.setItem('sg_user', JSON.stringify(updatedUser));
    }
  };

  const handleAuth = (profile: UserProfile) => {
    soundService.playClick();
    const newUser = { ...profile, unlockedThemes: ['dashain'], currentTheme: 'dashain' };
    setUser(newUser);
    localStorage.setItem('sg_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    soundService.playClick();
    setUser(null);
    localStorage.removeItem('sg_user');
    localStorage.removeItem('sg_wallet_state');
  };

  const enterGame = (game: GameMetadata) => {
    soundService.playClick();
    if (adCredits >= game.entryFee) {
      if (confirm(`Use ${game.entryFee} Ad Credits to play?`)) {
        addTransaction(-game.entryFee, 'GAME_ENTRY', 'AD_CREDIT');
        setCurrentGame(game);
        return;
      }
    }

    if (tokens < game.entryFee) {
      if (confirm("Insufficient tokens! Would you like to go to the Wallet to Top Up via Bank?")) {
        setActiveTab('wallet');
      }
      return;
    }
    
    addTransaction(-game.entryFee, 'GAME_ENTRY', 'TOKEN');
    setCurrentGame(game);
  };

  const handleGameOver = (tokensEarned: number) => {
    if (tokensEarned > 0) {
      addTransaction(tokensEarned, 'GAME_WIN');
    }
    setCurrentGame(null);
    setAiStrategy('');
  };

  if (!user) {
    return <AuthView onAuth={handleAuth} />;
  }

  if (currentGame) {
    return (
      <Layout activeTab="home" setActiveTab={handleTabChange} tokens={tokens} adCredits={adCredits}>
        <div className="flex-1 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-slate-800/50 border-b border-slate-700">
            <button onClick={() => { soundService.playClick(); setCurrentGame(null); }} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-sm">
              <i className="fa-solid fa-chevron-left"></i>
              Quit
            </button>
            <h2 className="font-black text-indigo-400 uppercase tracking-tighter">{currentGame.name}</h2>
            <button 
              onClick={async () => {
                soundService.playClick();
                setIsLoadingAi(true);
                const s = await getGameStrategy(currentGame.name, "I'm looking for a winning strategy.");
                setAiStrategy(s);
                setIsLoadingAi(false);
              }} 
              disabled={isLoadingAi}
              className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center"
            >
              <i className={`fa-solid ${isLoadingAi ? 'fa-spinner animate-spin' : 'fa-brain'}`}></i>
            </button>
          </div>
          
          {aiStrategy && (
            <div className="m-4 p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl flex gap-3">
              <i className="fa-solid fa-robot text-indigo-400 mt-1"></i>
              <p className="text-xs text-indigo-200 italic leading-relaxed">"{aiStrategy}"</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {currentGame.id === GameType.SNAKE && <SnakeGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.LANGUR_BURJA && (
              <LangurBurja 
                currentBalance={tokens} 
                onBalanceChange={(amount, type) => addTransaction(amount, type)}
                onGameOver={() => setCurrentGame(null)} 
              />
            )}
            {currentGame.id === GameType.LUDO && <LudoGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.UNO && <UnoGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} userBalance={tokens} onRaiseBet={(amt) => addTransaction(-amt, 'GAME_ENTRY')} />}
            {currentGame.id === GameType.CARROM && <CarromGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.TEEN_PATTI && <TeenPatti entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.CALL_BREAK && <CallBreak entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.CHESS && <ChessGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            {currentGame.id === GameType.TETRIS && <TetrisGame entryFee={currentGame.entryFee} onGameOver={handleGameOver} />}
            
            {![GameType.SNAKE, GameType.LANGUR_BURJA, GameType.LUDO, GameType.UNO, GameType.CARROM, GameType.TEEN_PATTI, GameType.CALL_BREAK, GameType.CHESS, GameType.TETRIS].includes(currentGame.id) && (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700 text-4xl text-slate-500">
                  <i className="fa-solid fa-code"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Coming Soon</h3>
                  <p className="text-slate-500 text-sm">{currentGame.name} is currently in development.</p>
                </div>
                <button 
                  onClick={() => {
                    soundService.playClick();
                    setCurrentGame(null);
                  }}
                  className="bg-indigo-600 px-8 py-3 rounded-2xl font-bold"
                >
                  Return to Lobby
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange} tokens={tokens} adCredits={adCredits}>
      {activeTab === 'home' && (
        <div className="p-4 space-y-6 relative">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <DashainScenery />
          </div>

          <div className="relative z-10 flex items-center gap-3 bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50">
            <div className="relative">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-12 h-12 rounded-full border-2 border-indigo-500" />
              {user.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] px-1 rounded-full border-2 border-slate-900">
                  <i className="fa-solid fa-check"></i>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Welcome back,</p>
              <h3 className="font-black text-white text-lg leading-none">{user.username}</h3>
            </div>
          </div>

          <section className="relative z-10 space-y-4">
            <h2 className="font-black text-2xl px-1">Top Games</h2>
            <div className="grid grid-cols-2 gap-4">
              {GAMES.map((game) => (
                <div 
                  key={game.id} 
                  onClick={() => enterGame(game)}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 group cursor-pointer active:scale-95 transition-all hover:border-indigo-500/50 shadow-lg"
                >
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                    <i className={`fa-solid ${game.icon} text-xl ${game.id === GameType.LANGUR_BURJA ? 'text-amber-500' : 'text-indigo-400'} group-hover:text-white`}></i>
                  </div>
                  <h3 className="font-bold text-sm mb-1 leading-tight">{game.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest">{game.category}</span>
                    <span className="text-xs font-black text-amber-500">{game.entryFee}T</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'market' && (
        <StoreView 
          tokens={tokens} 
          unlockedThemes={unlockedThemes} 
          onPurchase={handlePurchase} 
          onRedeem={handleRedeem} 
        />
      )}

      {activeTab === 'ads' && (
        <AdsView 
          onReward={(amount) => { soundService.playWin(); addTransaction(amount, 'AD_REWARD', 'AD_CREDIT'); }} 
          dailyAdRewards={dailyAdRewards}
        />
      )}

      {activeTab === 'wallet' && (
        <WalletView 
          tokens={tokens} 
          adCredits={adCredits}
          transactions={transactions} 
          onDeposit={(amt) => { soundService.playWin(); addTransaction(amt, 'DEPOSIT'); }}
        />
      )}

      {activeTab === 'profile' && (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col items-center text-center space-y-4 mt-4">
            <div className="relative">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-24 h-24 rounded-3xl border-4 border-indigo-600 shadow-2xl rotate-3" />
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12 border-4 border-slate-900">
                <i className="fa-solid fa-crown text-white text-xs"></i>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-2xl font-black">{user.username}</h2>
                {user.isVerified && <i className="fa-solid fa-circle-check text-indigo-500 text-lg"></i>}
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                {user.isGuest ? 'Guest Player' : 'Verified Member'} • Level 42
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full">
             <div className="bg-slate-800/50 p-4 rounded-3xl border border-slate-700/50">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Security</p>
                <p className="font-black text-indigo-400 text-xs">{user.isVerified ? 'ENCRYPTED' : 'GUEST'}</p>
             </div>
             <div className="bg-slate-800/50 p-4 rounded-3xl border border-slate-700/50">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Gallery</p>
                <p className="font-black text-indigo-400 text-xs">{unlockedThemes.length} / 5 Themes</p>
             </div>
          </div>

          {/* Theme Gallery Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Atmosphere Gallery</h3>
              <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Personalize</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {(Object.entries(THEME_PREVIEWS) as [ThemeType, any][]).map(([themeKey, config]) => {
                const isUnlocked = unlockedThemes.includes(themeKey);
                const isActive = user.currentTheme === themeKey;
                
                return (
                  <div 
                    key={themeKey}
                    onClick={() => handleThemeChange(themeKey)}
                    className={`
                      flex-shrink-0 w-28 p-3 rounded-3xl border-2 transition-all cursor-pointer relative
                      ${isActive ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105' : 'bg-slate-800/40 border-slate-700/50 opacity-80'}
                      ${!isUnlocked && 'grayscale brightness-50'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg ${config.color}`}>
                      <i className={`fa-solid ${config.icon}`}></i>
                    </div>
                    <p className={`text-[10px] font-black uppercase truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {config.name}
                    </p>
                    
                    {!isUnlocked && (
                      <div className="absolute top-2 right-2 text-slate-400 text-[10px]">
                        <i className="fa-solid fa-lock"></i>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] shadow-lg">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="w-full space-y-3 pt-4">
            <button onClick={() => setActiveTab('market')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
              <i className="fa-solid fa-store text-indigo-500"></i>
              Atmosphere Market
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-red-500/5 hover:bg-red-500/10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-500 flex items-center justify-center gap-3 border border-red-500/20 transition-all"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              System Shutdown
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
