
import React, { useState } from 'react';
import { StoreItem, ThemeType } from '../types';
import { STORE_ITEMS } from '../constants';
import { soundService } from '../services/soundService';

interface StoreViewProps {
  tokens: number;
  unlockedThemes: ThemeType[];
  onPurchase: (item: StoreItem) => void;
  onRedeem: (tokens: number, bankDetails: string) => void;
}

const StoreView: React.FC<StoreViewProps> = ({ tokens, unlockedThemes, onPurchase, onRedeem }) => {
  const [activeCategory, setActiveCategory] = useState<'TOKENS' | 'MERCH' | 'THEMES' | 'REDEEM'>('TOKENS');
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [bankInfo, setBankInfo] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredItems = STORE_ITEMS.filter(item => {
    if (activeCategory === 'TOKENS') return item.type === 'TOKEN_PACK';
    if (activeCategory === 'MERCH') return item.type === 'MERCH';
    if (activeCategory === 'THEMES') return item.type === 'THEME';
    return false;
  });

  const handleRedeemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(redeemAmount);
    if (!amount || amount < 100) {
      alert("Minimum redemption is 100 Tokens.");
      return;
    }
    if (amount > tokens) {
      alert("Insufficient Tokens.");
      return;
    }
    if (!bankInfo.trim()) {
      alert("Please provide valid bank account/wallet info.");
      return;
    }

    setIsProcessing(true);
    soundService.playClick();
    setTimeout(() => {
      onRedeem(amount, bankInfo);
      setRedeemAmount('');
      setBankInfo('');
      setIsProcessing(false);
      soundService.playWin();
    }, 2000);
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500">
      {/* Category Tabs */}
      <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
        {(['TOKENS', 'MERCH', 'THEMES', 'REDEEM'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); soundService.playTab(); }}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {activeCategory === 'REDEEM' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1">Exchange Center</p>
            <h2 className="text-2xl font-black text-white italic">CASH OUT TOKENS</h2>
            <div className="mt-4 flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-white/80">Rate: 100 Tokens = $1.00</span>
              <span className="text-xs font-black text-white bg-white/10 px-2 py-1 rounded-lg">LIVE</span>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <form onSubmit={handleRedeemSubmit} className="bg-slate-800/50 border border-slate-700 rounded-[2.5rem] p-6 space-y-4 shadow-xl">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase px-1">Amount to Redeem</label>
              <div className="relative">
                <input 
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="Min 100"
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white text-xl font-black focus:outline-none focus:border-amber-500 transition-all"
                />
                <i className="fa-solid fa-coins absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 text-lg"></i>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase px-1">Bank / Wallet Details</label>
              <textarea 
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                placeholder="Account Name, Number, Bank, or eSewa ID"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-amber-500 transition-all h-24 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isProcessing || !redeemAmount}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-600/30 flex items-center justify-center gap-3 transition-all"
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  PROCESING TRANSACTION
                </>
              ) : (
                <>
                  <i className="fa-solid fa-money-bill-transfer"></i>
                  REDEEM TO BANK
                </>
              )}
            </button>
            <p className="text-[8px] text-slate-500 font-black text-center uppercase tracking-tighter">* Transactions usually take 24-48 business hours.</p>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => {
            const isOwned = item.type === 'THEME' && unlockedThemes.includes(item.id.replace('theme_', '') as ThemeType);
            
            return (
              <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 flex items-center gap-4 transition-all hover:bg-slate-800/60 hover:border-indigo-500/50 group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-white/5 ${item.type === 'TOKEN_PACK' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  <i className={`fa-solid ${item.icon}`}></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-white uppercase tracking-tight">{item.name}</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">{item.description}</p>
                </div>
                <button 
                  onClick={() => { if(!isOwned) onPurchase(item); soundService.playClick(); }}
                  disabled={isOwned || (item.currency === 'TOKEN' && tokens < item.price)}
                  className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isOwned ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-white text-slate-950 hover:scale-105 active:scale-95'}`}
                >
                  {isOwned ? 'OWNED' : `${item.currency === 'USD' ? '$' : ''}${item.price}${item.currency === 'TOKEN' ? ' T' : ''}`}
                </button>
              </div>
            );
          })}

          <div className="py-8 text-center opacity-30">
            <i className="fa-solid fa-box-open text-4xl mb-2"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">More items coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreView;
