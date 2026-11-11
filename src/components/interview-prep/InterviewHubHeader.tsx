import React from 'react';
import {
  Sparkles,
  Coins,
  Mic,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  Plus,
} from 'lucide-react';

interface InterviewHubHeaderProps {
  walletBalance: number;
  upcomingCount: number;
  onStartNewPractice: () => void;
  activeTab: 'hub' | 'upcoming' | 'history';
  onSelectTab: (tab: 'hub' | 'upcoming' | 'history') => void;
}

export const InterviewHubHeader: React.FC<InterviewHubHeaderProps> = ({
  walletBalance,
  upcomingCount,
  onStartNewPractice,
  activeTab,
  onSelectTab,
}) => {
  // 50 coins per AI interview
  const aiInterviewsRemaining = Math.floor(walletBalance / 50);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800 text-slate-100 px-4 sm:px-6 pt-5 pb-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Screen 0 Header Wireframe */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-teal-950/30 border border-purple-900/30 shadow-xl shadow-purple-950/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-sm shadow-purple-400" />
              <span className="text-xs font-bold text-purple-400 tracking-wider uppercase font-mono">
                🟣 INTERVIEW PREPARATION
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              INTERVIEW HUB
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
              Master your interview skills with AI-powered sessions and real-world questions.
            </p>
          </div>

          {/* Right Action Block: Credits Card + 🎙️ Start New Practice Session */}
          <div className="flex flex-wrap items-center gap-3">
            {/* CREDITS CARD */}
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex flex-col justify-center min-w-[160px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-amber-400" />
                CREDITS
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono font-bold text-sm text-slate-100">
                  {aiInterviewsRemaining} AI Interviews
                </span>
                <span className="text-[11px] font-mono text-amber-300 font-semibold">
                  ({walletBalance} Coins)
                </span>
              </div>
            </div>

            {/* 🎙️ START NEW PRACTICE SESSION BUTTON */}
            <button
              id="btn-start-new-practice-session"
              onClick={onStartNewPractice}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-teal-500 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-extrabold text-sm shadow-lg shadow-purple-500/20 hover:shadow-teal-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 cursor-pointer group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">🎙️</span>
              <div className="text-left">
                <div className="leading-tight">Start New Practice</div>
                <div className="text-[10px] font-medium opacity-90 leading-tight">Session</div>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pt-1">
          <button
            onClick={() => onSelectTab('hub')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'hub'
                ? 'text-teal-400 border-teal-400 bg-teal-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Interview Hub & Scenarios</span>
          </button>

          <button
            onClick={() => onSelectTab('upcoming')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'text-teal-400 border-teal-400 bg-teal-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>My Practice</span>
            {upcomingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/40">
                {upcomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-teal-400 border-teal-400 bg-teal-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Past Transcripts & Reviews</span>
          </button>
        </div>
      </div>
    </div>
  );
};
