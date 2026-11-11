import React from 'react';
import {
  Radio,
  Award,
  Volume2,
} from 'lucide-react';
import { CEFRLevel, LanguageOption } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/presetScenarios';

interface HeaderProps {
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  currentCefr: CEFRLevel;
  onSelectCefr: (cefr: CEFRLevel) => void;
  onOpenScenarios?: () => void;
  onOpenVocabulary?: () => void;
  onOpenHistory?: () => void;
  onOpenProctoring?: () => void;
  onOpenEyeGazeLab?: () => void;
  isProctoringActive?: boolean;
  integrityScore?: number;
  onEndSession?: () => void;
  isLiveConnected: boolean;
  hasActiveSession: boolean;
  messageCount: number;
  savedSessionCount?: number;
  walletBalance?: number;
  onOpenPracticeSetup?: () => void;
  currentView?: 'hub' | 'room';
  onSelectView?: (view: 'hub' | 'room') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onSelectLanguage,
  currentCefr,
  onSelectCefr,
  onEndSession,
  isLiveConnected,
  hasActiveSession,
  messageCount,
  walletBalance = 450,
  onOpenPracticeSetup,
  currentView = 'hub',
  onSelectView,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title (Navigates to Hub) */}
        <div
          onClick={() => onSelectView?.('hub')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          title="Return to Interview Hub"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-teal-500 to-cyan-400 p-[2px] shadow-md shadow-teal-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-100 group-hover:text-teal-300 transition-colors">
                NativeFlow
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                AI Hub
              </span>
            </div>
          </div>
        </div>

        {/* Center: Language & CEFR Selectors */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Selector (Includes Indian English Accent & Hindi) */}
          <div className="relative">
            <select
              id="header-language-select"
              value={currentLanguage.id}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.id === e.target.value);
                if (found) onSelectLanguage(found);
              }}
              className="bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs sm:text-sm font-semibold pl-2.5 pr-8 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 focus:outline-none focus:border-teal-400 cursor-pointer transition-colors shadow-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* CEFR Level Selector */}
          <div className="relative hidden sm:block">
            <select
              id="header-cefr-select"
              value={currentCefr}
              onChange={(e) => onSelectCefr(e.target.value as CEFRLevel)}
              className="bg-slate-800 hover:bg-slate-750 text-teal-300 text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 focus:outline-none focus:border-teal-400 cursor-pointer shadow-sm"
            >
              <option value="B2 Upper Intermediate">B2 Upper</option>
              <option value="C1 Advanced">C1 Advanced</option>
              <option value="C2 Mastery / Native Nuance">C2 Mastery</option>
            </select>
          </div>

          {/* Live Status Pill */}
          <div
            id="header-live-status"
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLiveConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <Radio className="w-3 h-3" />
            <span className="text-[11px] font-medium">{isLiveConnected ? 'Live Audio' : 'Standby'}</span>
          </div>
        </div>

        {/* Right: Primary Action (Start Practice CTA) */}
        <div className="flex items-center gap-2">
          {onOpenPracticeSetup && (
            <button
              id="btn-header-start-practice"
              onClick={onOpenPracticeSetup}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 via-teal-500 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer transform hover:scale-102"
              title="Schedule or launch AI Mock Interview"
            >
              <span>🎙️</span>
              <span className="hidden sm:inline">Start Practice</span>
              <span className="font-mono text-[10px] bg-slate-950/70 px-1.5 py-0.5 rounded-lg text-amber-300 font-bold border border-amber-400/30">
                🪙 {walletBalance}
              </span>
            </button>
          )}

          {/* Assessment (Only when session has >= 2 turns in active room) */}
          {hasActiveSession && messageCount >= 2 && currentView === 'room' && onEndSession && (
            <button
              id="btn-evaluate-session"
              onClick={onEndSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 rounded-xl shadow-md shadow-teal-500/20 animate-pulse cursor-pointer"
              title="Generate comprehensive interview scorecard"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Scorecard</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
