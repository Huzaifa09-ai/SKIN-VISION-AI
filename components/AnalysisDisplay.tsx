
import React from 'react';
import { SkinVisionResult, SensitivityLevel } from '../types';

interface AnalysisDisplayProps {
  result: SkinVisionResult | null;
  activeTab: 'report' | 'routine' | 'nature';
  onTabChange: (tab: 'report' | 'routine' | 'nature') => void;
  isPremium: boolean;
  userSensitivity?: SensitivityLevel;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, activeTab, onTabChange, isPremium, userSensitivity }) => {
  const analysis = result?.skin_analysis || { skin_type: 'Unknown', skin_score: 0, concerns: [], summary: 'Synthesizing...' };
  const concerns = analysis.concerns || [];
  const routine = result?.product_routine || { morning: [], night: [] };
  const nature = result?.homemade_skincare || [];

  const PremiumLock = ({ title }: { title: string }) => (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-8 text-center rounded-[inherit]">
      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
        <i className="fa-solid fa-lock text-lg"></i>
      </div>
      <h4 className="text-slate-900 font-black uppercase text-xs tracking-widest mb-1">{title}</h4>
      <p className="text-slate-500 text-[10px] font-bold max-w-[180px]">Upgrade to Elite for Scientist-Approved results.</p>
    </div>
  );

  return (
    <div className="p-6 pb-32 animate-in space-y-6">
      <div className="flex flex-col items-center gap-2">
        <div className="bg-emerald-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center gap-2">
           <i className="fa-solid fa-circle-check"></i>
           Elite Verified
        </div>
      </div>

      <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
        {(['report', 'routine', 'nature'] as const).map((tab) => (
          <button key={tab} onClick={() => onTabChange(tab)}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            {tab === 'report' ? 'Bio-Map' : tab === 'routine' ? 'Regimen' : 'Apothecary'}
          </button>
        ))}
      </div>

      {activeTab === 'report' && (
        <div className="space-y-6 animate-in">
          <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden text-center">
             <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 text-emerald-400">Bio-Score</p>
             <div className="text-6xl font-black mb-4 tracking-tighter">{analysis.skin_score}%</div>
             <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
               <div className="h-full bg-emerald-500" style={{ width: `${analysis.skin_score}%` }}></div>
             </div>
             <div className="font-black text-lg text-emerald-400">{analysis.skin_type}</div>
             {!isPremium && <PremiumLock title="Elite Metrics" />}
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
             <div className="text-[10px] font-black uppercase mb-4 text-slate-400">Scientist Summary</div>
             <p className="text-xs text-slate-600 leading-relaxed italic mb-6 font-medium">"{analysis.summary}"</p>
             <div className="flex flex-wrap gap-2">
                {concerns.map((c, i) => (
                   <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black border border-slate-100">{c}</span>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'routine' && (
        <div className="space-y-6 animate-in">
           {['morning', 'night'].map((time) => (
             <div key={time} className="bg-white p-6 rounded-[40px] border border-slate-100 relative overflow-hidden">
                <h3 className="font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                   <i className={`fa-solid ${time === 'morning' ? 'fa-sun text-amber-500' : 'fa-moon text-indigo-500'}`}></i>
                   {time} Protocol
                </h3>
                <div className="space-y-6">
                   {(routine as any)[time]?.map((m: any, i: number) => (
                      <div key={i} className="flex gap-4">
                         <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] text-slate-400">{i+1}</div>
                         <div>
                            <div className="font-black text-slate-900 text-xs mb-0.5">{m.step}</div>
                            <div className="text-[9px] text-emerald-500 font-black uppercase mb-1.5">{m.type}</div>
                            <p className="text-[10px] text-slate-500 leading-tight font-medium">{m.how_to_use}</p>
                         </div>
                      </div>
                   ))}
                </div>
                {!isPremium && <PremiumLock title="Expert Synergy" />}
             </div>
           ))}
        </div>
      )}

      {activeTab === 'nature' && (
        <div className="space-y-6 animate-in">
           {nature.map((n, i) => (
              <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 relative overflow-hidden">
                 <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tighter">{n.recipe_name}</h3>
                 <p className="text-[9px] text-emerald-500 mb-6 font-black uppercase tracking-widest">{n.purpose}</p>
                 <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Key Ingredients (Max 3)</div>
                    <div className="flex flex-wrap gap-2">
                       {n.ingredients?.map((ing, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black border border-slate-200">{ing}</span>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="text-[8px] font-black text-slate-900 uppercase tracking-widest mb-2">Zero-Waste Guide</div>
                    <ul className="space-y-3">
                       {n.how_to_make?.map((step, s) => (
                          <li key={s} className="flex gap-3">
                             <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0">{s + 1}</span>
                             <p className="text-[10px] text-slate-600 leading-tight font-bold">{step}</p>
                          </li>
                       ))}
                    </ul>
                 </div>
                 {!isPremium && <PremiumLock title="DIY Apothecary" />}
              </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisDisplay;
