import React, { useState } from 'react';
import { UserProfile } from '../types';
import { soundService } from '../services/soundService';
import DashainScenery from './DashainScenery';

interface AuthViewProps {
  onAuth: (profile: UserProfile) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playClick();
    setIsLoading(true);
    setTimeout(() => {
      onAuth({
        email,
        isVerified: true,
        isGuest: false,
        username: email.split('@')[0] || 'RebelUser',
      });
      setIsLoading(false);
    }, 1200);
  };

  const handleGuest = () => {
    soundService.playClick();
    onAuth({
      email: null,
      isVerified: false,
      isGuest: true,
      username: `Nomad_${Math.floor(Math.random() * 9000) + 1000}`,
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Cyberpunk Himalayan Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1544735745-b89b18555f35?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-30 grayscale contrast-150 brightness-50"></div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent"></div>
        
        {/* Full Scenic Background */}
        <DashainScenery />
      </div>

      <div className="w-full max-w-sm space-y-8 relative z-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="text-center">
          <div className="inline-block px-4 py-1 bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.3em] mb-4 skew-x-[-12deg]">
            Limited Season Release
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white glitch-text mb-2">
            DASHAIN<br/><span className="text-red-600">MENIAC</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mb-12">Break the traditions. Own the game.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-red-600 transition-all font-bold placeholder:text-slate-700"
                placeholder="EMAIL_OR_USERNAME"
              />
            </div>
            <div className="space-y-1">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-red-600 transition-all font-bold placeholder:text-slate-700"
                placeholder="SECURE_PASSCODE"
              />
            </div>

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl shadow-xl shadow-red-600/40 transition-all active:scale-95 uppercase tracking-tighter italic"
            >
              {isLoading ? <i className="fa-solid fa-skull animate-spin"></i> : isLogin ? 'ENTER_VOID' : 'JOIN_THE_PACK'}
            </button>
          </form>

          <button 
            onClick={handleGuest}
            className="w-full mt-4 py-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors"
          >
            Continue as Guest_
          </button>
        </div>
        
        <div className="flex justify-center gap-6 pt-4 grayscale opacity-40">
           <i className="fa-solid fa-mountain text-2xl"></i>
           <i className="fa-solid fa-om text-2xl"></i>
           <i className="fa-solid fa-yin-yang text-2xl"></i>
        </div>
      </div>
    </div>
  );
};

export default AuthView;