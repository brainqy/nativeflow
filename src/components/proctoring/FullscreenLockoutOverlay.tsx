import React from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Maximize,
  ArrowRight,
  Clock,
  Radio,
} from 'lucide-react';
import { ProctoringViolationType } from '../../types';

interface FullscreenLockoutOverlayProps {
  reason: string;
  incidentType: ProctoringViolationType;
  strikeCount: number;
  maxStrikes: number;
  onResolve: () => void;
}

export const FullscreenLockoutOverlay: React.FC<FullscreenLockoutOverlayProps> = ({
  reason,
  incidentType,
  strikeCount,
  maxStrikes,
  onResolve,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Warning Icon with Pulsing Halo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-bounce">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-rose-400 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 inline-block mb-2">
            SECURITY LOCKOUT TRIGGERED
          </span>
          <h3 className="text-lg font-black text-slate-100">
            Out-of-Bounds Application Event
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
            {reason}
          </p>
        </div>

        {/* Strike Meter */}
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs">
          <div className="flex items-center justify-between mb-1.5 font-bold">
            <span className="text-slate-300">Anti-Cheat Strike Status:</span>
            <span className="text-rose-400 font-mono">
              Strike {strikeCount} of {maxStrikes}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex gap-1">
            {Array.from({ length: maxStrikes }).map((_, idx) => (
              <div
                key={idx}
                className={`h-full flex-1 rounded-full ${
                  idx < strikeCount ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-left">
            {strikeCount >= maxStrikes
              ? 'Maximum strikes exceeded. Your interview session is flagged for Recruiter Committee Review.'
              : 'Switching apps, minimizing browser, or exiting fullscreen breaches integrity guidelines.'}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onResolve}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <Maximize className="w-4 h-4" />
          <span>Re-enter Fullscreen & Resume Interview</span>
        </button>

        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Incident timestamped and recorded in proctoring audit trail.</span>
        </div>
      </div>
    </div>
  );
};
