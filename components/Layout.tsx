
import React, { useEffect, useState } from 'react';
import { soundService } from '../services/soundService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'market' | 'wallet' | 'profile' | 'ads';
  setActiveTab: (tab: 'home' | 'market' | 'wallet' | 'profile' | 'ads') => void;
  tokens: number;
  adCredits: number;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, tokens, adCredits }) => {
  const [petals, setPetals] = useState<number[]>([]);
  const [musicState, setMusicState] = useState<'dashain' | 'tihar' | 'off'>(soundService.getCurrentTrack());
  const [showMusicMenu, setShowMusicMenu] = useState(false);

  useEffect(() => {
    // Generate some random petals for the background
    setPetals(Array.from({ length: 15 }).map((_, i) => i));
  }, []);

  const handleMusicToggle = (type: 'dashain' | 'tihar' | 'off') => {
    soundService.toggleMusic(type);
    setMusicState(type);
    setShowMusicMenu(false);
    soundService.playClick();
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950/40 backdrop-blur-sm border-x border-white/5 shadow-2xl relative overflow-hidden">
      {/* Falling Marigold Petals */}
      {petals.map((p) => (
        <div 
          key={p} 
          className="petal" 
          style={{ 
            left: `${Math.random() * 100}%`, 
            animationDuration: `${5 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
            background: Math.random() > 0.5 ? '#f59e0b' : '#ea580c',
            opacity: 0.6
          }} 
        />
      ))}

      {/* Header */}
      <header className="p-4 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30 rotate-3 border-2 border-white/20">
              <i className="fa-solid fa-fire text-white text-lg"></i>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic glitch-text leading-none">
                Dashain
              </h1>
              <span className="font-black text-red-600 text-xs italic tracking-tighter uppercase">Meniac</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowMusicMenu(!showMusicMenu)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${musicState !== 'off' ? 'bg-amber-500 border-white animate-pulse' : 'bg-white/5 border-white/10'}`}
              >
                <i className={`fa-solid ${musicState === 'off' ? 'fa-music' : 'fa-volume-high'} text-[10px]`}></i>
              </button>
              
              {showMusicMenu && (
                <div className="absolute top-10 right-0 w-32 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-[100] animate-in slide-in-from-top-2">
                  <p className="text-[8px] font-black uppercase text-slate-500 mb-2 px-2 tracking-widest">Select Mood</p>
                  <button 
                    onClick={() => handleMusicToggle('dashain')}
                    className={`w-full text-left p-2 rounded-xl text-[10px] font-black uppercase transition-all ${musicState === 'dashain' ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                  >
                    Mangal Dhun
                  </button>
                  <button 
                    onClick={() => handleMusicToggle('tihar')}
                    className={`w-full text-left p-2 rounded-xl text-[10px] font-black uppercase transition-all ${musicState === 'tihar' ? 'bg-amber-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                  >
                    Tihar Beats
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button 
                    onClick={() => handleMusicToggle('off')}
                    className={`w-full text-left p-2 rounded-xl text-[10px] font-black uppercase transition-all ${musicState === 'off' ? 'bg-slate-700 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                  >
                    Mute
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-0.5 rounded-lg border border-green-500/30">
                <i className="fa-solid fa-coins text-green-400 text-[10px]"></i>
                <span className="font-black text-green-400 text-[10px]">{tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 relative z-10">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-black/80 backdrop-blur-2xl border-t border-white/10 flex justify-around p-4 pb-8 z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-amber-500 scale-110' : 'text-slate-500 hover:text-white'}`}
        >
          <i className="fa-solid fa-ghost text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Lobby</span>
        </button>
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'market' ? 'text-amber-500 scale-110' : 'text-slate-500 hover:text-white'}`}
        >
          <i className="fa-solid fa-bag-shopping text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ads' ? 'text-amber-500 scale-110' : 'text-slate-500 hover:text-white'}`}
        >
          <i className="fa-solid fa-bolt text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Earn</span>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'wallet' ? 'text-amber-500 scale-110' : 'text-slate-500 hover:text-white'}`}
        >
          <i className="fa-solid fa-vault text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Vault</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-amber-500 scale-110' : 'text-slate-500 hover:text-white'}`}
        >
          <i className="fa-solid fa-skull text-xl"></i>
          <span className="text-[8px] font-black uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
