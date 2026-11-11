import React, { useState } from 'react';
import {
  Sparkles,
  Coins,
  Rocket,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  Check,
  Search,
  Code2,
  Cpu,
  Database,
  Cloud,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Volume2,
} from 'lucide-react';
import { PracticeSessionBooking, ConversationScenario } from '../../types';
import { PRESET_TOPICS } from './PracticeTopicSelection';
import { UpcomingSessionsList } from './UpcomingSessionsList';

interface InterviewHubPageProps {
  walletBalance: number;
  upcomingBookings: PracticeSessionBooking[];
  onStartNewPractice: () => void;
  onSelectTopicQuickStart: (topicName: string, role?: string, stack?: string) => void;
  onLaunchScheduledSession: (booking: PracticeSessionBooking) => void;
  onCancelBooking: (bookingId: string) => void;
  onOpenHistory: () => void;
  savedSessionCount: number;
  onQuickStartTrack?: (topicName: string, defaultRole?: string, defaultStack?: string) => void;
}

export const InterviewHubPage: React.FC<InterviewHubPageProps> = ({
  walletBalance,
  upcomingBookings,
  onStartNewPractice,
  onSelectTopicQuickStart,
  onLaunchScheduledSession,
  onCancelBooking,
  onOpenHistory,
  savedSessionCount,
  onQuickStartTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'topics' | 'upcoming' | 'recent'>('topics');
  const [searchFilter, setSearchFilter] = useState('');

  const activeUpcoming = upcomingBookings.filter((b) => b.status === 'upcoming');
  const aiInterviewsAvailable = Math.floor(walletBalance / 50);

  const filteredTopics = PRESET_TOPICS.filter((t) =>
    t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    t.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fadeIn text-slate-100">
      {/* =========================================================================
          SCREEN 0: THE INTERVIEW HUB HEADER & TRIGGER
          Wireframe specification:
          🟣 INTERVIEW PREPARATION
          INTERVIEW HUB
          Master your interview skills with AI-powered sessions and real-world questions.
          [ CREDITS: 8 AI Interviews (Coins) ]   [ 🎙️ Start New Practice Session ]
         ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-teal-950/50 border border-purple-800/40 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <span className="text-xs font-extrabold text-purple-400 tracking-widest uppercase font-mono">
                🟣 INTERVIEW PREPARATION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100 tracking-tight">
              INTERVIEW HUB
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Master your interview skills with AI-powered sessions, tailored real-world questions, anti-cheat proctoring, and instant executive critique.
            </p>
          </div>

          {/* Trigger Card Block */}
          <div className="flex flex-wrap items-center gap-3.5">
            {/* CREDITS CARD */}
            <div className="px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg flex flex-col justify-center min-w-[170px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                CREDITS
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono font-bold text-base text-slate-100">
                  {aiInterviewsAvailable} AI Interviews
                </span>
                <span className="text-xs font-mono text-amber-300 font-semibold">
                  (🪙 {walletBalance})
                </span>
              </div>
            </div>

            {/* 🎙️ START NEW PRACTICE SESSION BUTTON */}
            <button
              id="btn-hub-start-new-practice"
              onClick={onStartNewPractice}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-teal-500 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-black text-sm sm:text-base shadow-xl shadow-purple-500/25 hover:shadow-teal-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 cursor-pointer group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">🎙️</span>
              <div className="text-left">
                <div className="leading-tight">Start New Practice</div>
                <div className="text-[11px] font-semibold text-teal-100/90 leading-tight">Session</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'topics'
              ? 'text-teal-400 border-teal-400 bg-teal-500/10'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Curated Interview Tracks</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'text-teal-400 border-teal-400 bg-teal-500/10'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Practice & Upcoming</span>
          {activeUpcoming.length > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/40">
              {activeUpcoming.length}
            </span>
          )}
        </button>

        <button
          onClick={onOpenHistory}
          className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850/50 flex items-center gap-2"
        >
          <History className="w-4 h-4 text-cyan-400" />
          <span>Completed Transcripts</span>
          {savedSessionCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              {savedSessionCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: CURATED TOPICS */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Select a Domain or Start Custom Session</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any topic card to launch or configure your mock interview with tailored production questions.
              </p>
            </div>

            {/* Quick Search Filter */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter domains..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => onSelectTopicQuickStart(topic.name, topic.defaultRole, topic.defaultStack)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850/90 transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-teal-500/5 relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{topic.icon}</span>
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-teal-300 flex items-center gap-1 transition-colors">
                      Configure <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition-colors">
                    {topic.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[170px] font-mono text-slate-400">
                      {topic.defaultRole.split('@')[1] ? `@${topic.defaultRole.split('@')[1].trim()}` : 'Enterprise'}
                    </span>
                    <span className="font-mono text-amber-400/90 font-semibold">🪙 50 Coins</span>
                  </div>

                  {/* Quick Start 1-Click Action Button */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id={`btn-quick-start-${topic.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onQuickStartTrack) {
                          onQuickStartTrack(topic.name, topic.defaultRole, topic.defaultStack);
                        } else {
                          onSelectTopicQuickStart(topic.name, topic.defaultRole, topic.defaultStack);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-teal-500/15 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                      title={`Quick start ${topic.name} interview immediately`}
                    >
                      <Rocket className="w-3.5 h-3.5 text-slate-950" />
                      <span>⚡ Quick Start</span>
                    </button>

                    <button
                      id={`btn-configure-${topic.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTopicQuickStart(topic.name, topic.defaultRole, topic.defaultStack);
                      }}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
                      title="Customize questions count, difficulty, and proctoring"
                    >
                      <span>⚙️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY PRACTICE & UPCOMING SESSIONS */}
      {activeTab === 'upcoming' && (
        <UpcomingSessionsList
          bookings={upcomingBookings}
          onLaunchSession={onLaunchScheduledSession}
          onCancelBooking={onCancelBooking}
          onStartNewPractice={onStartNewPractice}
        />
      )}
    </div>
  );
};
