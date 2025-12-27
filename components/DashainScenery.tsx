import React from 'react';

const DashainScenery: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Distant Hills */}
      <div className="absolute bottom-0 w-full h-1/2 opacity-20">
        <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full h-full scale-110 origin-bottom">
          <path fill="#0f172a" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,213.3C672,203,768,149,864,154.7C960,160,1056,224,1152,224C1248,224,1344,160,1392,128L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Village Houses Silhouette */}
      <div className="absolute bottom-10 left-0 w-full flex justify-around opacity-40 px-10">
        <div className="flex flex-col items-center">
          <i className="fa-solid fa-house-chimney text-3xl text-slate-800"></i>
          <div className="w-10 h-1 bg-slate-800 mt-[-2px]"></div>
        </div>
        <div className="flex flex-col items-center translate-y-4">
          <i className="fa-solid fa-tree text-4xl text-slate-900"></i>
        </div>
        <div className="flex flex-col items-center -translate-y-2">
          <i className="fa-solid fa-synagogue text-5xl text-slate-800"></i>
        </div>
      </div>

      {/* Traditional Swing (Ping) */}
      <div className="absolute bottom-16 right-12 flex flex-col items-center">
        {/* Frame */}
        <div className="flex gap-16 relative">
          <div className="w-1.5 h-32 bg-amber-900 rounded-full rotate-[10deg] origin-bottom shadow-lg"></div>
          <div className="w-1.5 h-32 bg-amber-900 rounded-full -rotate-[10deg] origin-bottom shadow-lg"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-amber-900 rounded-full"></div>
          
          {/* Moving Swing */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 swing-anim flex flex-col items-center">
            <div className="flex gap-6">
              <div className="w-0.5 h-20 bg-amber-200/40"></div>
              <div className="w-0.5 h-20 bg-amber-200/40"></div>
            </div>
            <div className="w-8 h-1 bg-amber-100/60 rounded-full shadow-sm"></div>
            {/* Silhouette of a person swinging */}
            <div className="absolute bottom-0 w-4 h-6 bg-indigo-500/20 rounded-t-full -translate-y-1"></div>
          </div>
        </div>
        <p className="text-[6px] font-black uppercase text-white/10 mt-2 tracking-widest">Village Life</p>
      </div>

      {/* Multi-kite Fleet */}
      <div className="absolute inset-0">
        {/* Kite 1: Large Red */}
        <div className="absolute top-[15%] left-[20%] kite-anim">
          <div className="w-12 h-12 bg-red-600 border-2 border-white/40 rotate-45 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
            <div className="absolute top-0 left-1/2 h-full w-px bg-white/20"></div>
          </div>
          <div className="w-px h-24 bg-white/20 absolute top-12 left-6 origin-top rotate-12"></div>
        </div>

        {/* Kite 2: Medium Yellow */}
        <div className="absolute top-[30%] right-[25%] kite-anim-fast">
          <div className="w-8 h-8 bg-amber-400 border border-white/40 rotate-45 shadow-[0_0_15px_rgba(251,191,36,0.2)]"></div>
          <div className="w-px h-20 bg-white/10 absolute top-8 left-4 origin-top -rotate-6"></div>
        </div>

        {/* Kite 3: Small Blue (Distant) */}
        <div className="absolute top-[10%] right-[10%] kite-anim opacity-40 scale-50">
          <div className="w-6 h-6 bg-blue-500 border border-white/40 rotate-45"></div>
          <div className="w-px h-16 bg-white/5 absolute top-6 left-3 origin-top rotate-[20deg]"></div>
        </div>
      </div>
    </div>
  );
};

export default DashainScenery;