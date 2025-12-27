
import React, { useState } from 'react';
import { Transaction } from '../types';
import { soundService } from '../services/soundService';

interface WalletViewProps {
  tokens: number;
  adCredits: number;
  transactions: Transaction[];
  onDeposit: (amount: number) => void;
}

const WalletView: React.FC<WalletViewProps> = ({ tokens, adCredits, transactions, onDeposit }) => {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeposit = () => {
    soundService.playClick();
    const amt = parseInt(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      onDeposit(amt);
      setDepositAmount('');
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-5 shadow-xl shadow-green-500/20 text-white relative overflow-hidden">
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Token Balance</p>
          <h2 className="text-3xl font-black flex items-center gap-2">
            <i className="fa-solid fa-coins text-white opacity-80"></i>
            {tokens.toLocaleString()}
          </h2>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-xl text-white relative overflow-hidden">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Ad Credits</p>
          <h2 className="text-3xl font-black flex items-center gap-2">
            <i className="fa-solid fa-rectangle-ad text-indigo-400"></i>
            {adCredits.toLocaleString()}
          </h2>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-[2.5rem] p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
           <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-building-columns text-indigo-400"></i>
            Banking Integration
          </h3>
          <div className="flex gap-2">
             <i className="fa-brands fa-cc-visa text-slate-600 text-xl"></i>
             <i className="fa-brands fa-cc-mastercard text-slate-600 text-xl"></i>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              onFocus={() => soundService.playTab()}
              placeholder="0.00"
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white text-xl font-black focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">$</span>
          </div>
          
          <button 
            onClick={handleDeposit}
            disabled={isProcessing || !depositAmount}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                Processing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-check"></i>
                Deposit Funds
              </>
            )}
          </button>
        </div>

        <div className="flex justify-around pt-2">
           <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mb-1">
                 <i className="fa-solid fa-lock text-slate-600 text-xs"></i>
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase">Secure</span>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mb-1">
                 <i className="fa-solid fa-bolt text-slate-600 text-xs"></i>
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase">Instant</span>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mb-1">
                 <i className="fa-solid fa-headset text-slate-600 text-xs"></i>
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase">Support</span>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-lg flex justify-between items-center px-2 uppercase tracking-tight">
          Recent Activity
          <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">View Statement</button>
        </h3>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-slate-700 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
              <i className="fa-solid fa-receipt text-4xl mb-3 block opacity-20"></i>
              <p className="font-black text-xs uppercase tracking-widest">No Transactions Yet</p>
            </div>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 flex justify-between items-center transition-all hover:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <i className={`fa-solid ${tx.type === 'DEPOSIT' ? 'fa-arrow-down' : tx.type === 'GAME_WIN' ? 'fa-trophy' : 'fa-gamepad'}`}></i>
                  </div>
                  <div>
                    <p className="font-black text-xs text-white uppercase tracking-tight">{tx.type.replace('_', ' ')}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : '-'}${Math.abs(tx.amount)}
                  </p>
                  <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">
                    {tx.currency}
                  </p>
                </div>
              </div>
            )).reverse()
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletView;
