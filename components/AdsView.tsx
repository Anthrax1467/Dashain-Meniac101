
import React, { useState, useEffect } from 'react';

interface AdsViewProps {
  onReward: (credits: number) => void;
  dailyAdRewards: number;
}

const DAILY_LIMIT = 500;
const AD_REWARD_AMOUNT = 25;

const AdsView: React.FC<AdsViewProps> = ({ onReward, dailyAdRewards }) => {
  const [isWatching, setIsWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [adContent, setAdContent] = useState('');

  const ADS = [
    { title: "GamerPro Headphones", brand: "AudioX", duration: 5 },
    { title: "Ultimate Energy Drink", brand: "PowerUp", duration: 6 },
    { title: "Modern Banking App", brand: "SwiftBank", duration: 4 },
    { title: "New Gaming Laptop", brand: "Nitro", duration: 5 }
  ];

  const watchAd = () => {
    if (dailyAdRewards + AD_REWARD_AMOUNT > DAILY_LIMIT) {
      alert("Daily limit reached! Come back tomorrow for more rewards.");
      return;
    }
    const randomAd = ADS[Math.floor(Math.random() * ADS.length)];
    setAdContent(randomAd.title);
    setCountdown(randomAd.duration);
    setIsWatching(true);
  };

  useEffect(() => {
    let timer: number;
    if (isWatching && countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isWatching && countdown === 0) {
      setIsWatching(false);
      onReward(AD_REWARD_AMOUNT);
    }
    return () => clearInterval(timer);
  }, [isWatching, countdown, onReward]);

  const progressPercentage = Math.min((dailyAdRewards / DAILY_LIMIT) * 100, 100);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <i className="fa-solid fa-rectangle-ad text-indigo-400"></i>
            Ad Rewards
          </h2>
          <p className="text-indigo-200/70 text-sm mb-6">Earn free Ad Credits to play premium games. Every second counts!</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Daily Limit Progress</span>
              <span className="text-xs font-black text-white">{dailyAdRewards} / {DAILY_LIMIT} AC</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
          <i className="fa-solid fa-video text-9xl"></i>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg px-1">Featured Offer</h3>
        <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[320px] relative overflow-hidden">
          {isWatching ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/50 border-4 border-white/20">
                <span className="text-4xl font-black text-white">{countdown}</span>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Commercial Break</p>
                <h4 className="text-2xl font-black text-white">{adContent}</h4>
              </div>
              <div className="flex gap-2 justify-center">
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150"></div>
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-300"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center border border-slate-800 shadow-2xl shadow-black/50 group hover:border-indigo-500/50 transition-all">
                <i className="fa-solid fa-play text-4xl text-indigo-500 group-hover:scale-110 transition-transform"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-white uppercase tracking-tight">Ready for Reward?</h4>
                <p className="text-slate-500 text-sm max-w-[200px]">Watch a short clip and get <span className="text-indigo-400 font-bold">25 AC</span> instantly.</p>
              </div>
              <button 
                onClick={watchAd}
                disabled={dailyAdRewards + AD_REWARD_AMOUNT > DAILY_LIMIT}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3"
              >
                {dailyAdRewards + AD_REWARD_AMOUNT > DAILY_LIMIT ? (
                  <>
                    <i className="fa-solid fa-lock text-sm"></i>
                    LIMIT REACHED
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt"></i>
                    CLAIM 25 AC
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <i className="fa-solid fa-shield-halved text-indigo-400 mb-2"></i>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safe Ads</p>
        </div>
        <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <i className="fa-solid fa-stopwatch text-indigo-400 mb-2"></i>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fast Credits</p>
        </div>
      </div>
    </div>
  );
};

export default AdsView;
