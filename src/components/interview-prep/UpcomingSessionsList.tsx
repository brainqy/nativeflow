import React from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Rocket,
  Trash2,
  Download,
  AlertCircle,
  Coins,
  ShieldCheck,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { PracticeSessionBooking } from '../../types';
import { generateIcsCalendarFile, downloadIcsFile } from '../../utils/calendarUtils';

interface UpcomingSessionsListProps {
  bookings: PracticeSessionBooking[];
  onLaunchSession: (booking: PracticeSessionBooking) => void;
  onCancelBooking: (bookingId: string) => void;
  onStartNewPractice: () => void;
}

export const UpcomingSessionsList: React.FC<UpcomingSessionsListProps> = ({
  bookings,
  onLaunchSession,
  onCancelBooking,
  onStartNewPractice,
}) => {
  const activeBookings = bookings.filter((b) => b.status === 'upcoming');

  const handleDownloadCalendar = (booking: PracticeSessionBooking) => {
    try {
      const ics = generateIcsCalendarFile({
        title: `Mock Interview: ${booking.topic} (${booking.aiConfig.difficulty})`,
        description: `Target Role: ${booking.jobRole || 'Software Engineer'}\nTech: ${booking.jobResponsibilities || booking.topic}\nQuestions: ${booking.aiConfig.numQuestions}`,
        scheduledTimestamp: booking.scheduledTimestamp || Date.now(),
        durationMinutes: 45,
      });
      downloadIcsFile(`Interview-${booking.topic.replace(/\s+/g, '_')}`, ics);
    } catch (e) {
      console.error('Failed to download .ics:', e);
    }
  };

  const formatScheduleText = (timestamp?: number, date?: string, time?: string) => {
    if (timestamp) {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (date && time) return `${date} at ${time}`;
    return 'Scheduled Soon';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            My Practice & Upcoming Sessions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your booked AI and expert mock interview slots, calendar invites, and instant launches.
          </p>
        </div>

        <button
          onClick={onStartNewPractice}
          className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> Book Another
        </button>
      </div>

      {activeBookings.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <Calendar className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            No Upcoming Sessions Scheduled
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            You don't have any pending practice sessions. Schedule an interview in advance or launch an immediate voice session.
          </p>
          <button
            onClick={onStartNewPractice}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs shadow-md shadow-teal-500/20 hover:from-teal-400 hover:to-emerald-500 transition-all inline-flex items-center gap-1.5"
          >
            <Rocket className="w-3.5 h-3.5" />
            Schedule New Practice Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBookings.map((session) => (
            <div
              key={session.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg shadow-black/20 group"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {session.topic.toLowerCase().includes('java') ? '☕' :
                         session.topic.toLowerCase().includes('react') ? '⚛️' :
                         session.topic.toLowerCase().includes('aws') ? '☁️' :
                         session.topic.toLowerCase().includes('python') ? '🐍' : '🎯'}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-teal-300 transition-colors">
                        {session.topic}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-teal-300">
                        {session.aiConfig.difficulty}
                      </span>
                      <span className="text-xs text-slate-400">
                        {session.aiConfig.numQuestions} Questions
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-amber-300 font-mono">
                        🪙 {session.totalCoins} Coins
                      </span>
                    </div>
                  </div>

                  {session.aiConfig.antiCheatProctoring && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0" title="Anti-Cheat & AI Proctoring Enabled">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Proctored
                    </span>
                  )}
                </div>

                {/* Timing Badge */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-cyan-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{formatScheduleText(session.scheduledTimestamp, session.scheduledDate, session.scheduledTime)}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Confirmed
                  </span>
                </div>

                {/* Role / Job description */}
                {session.jobRole && (
                  <div className="mb-3 text-xs text-slate-300 flex items-start gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">{session.jobRole}</span>
                      {session.jobResponsibilities && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {session.jobResponsibilities}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {session.categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 capitalize"
                    >
                      {c.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDownloadCalendar(session)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                  title="Download .ics Calendar Invite for Google/Outlook/Apple Calendar"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Add to Calendar (.ics)</span>
                  <span className="sm:hidden">.ics</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCancelBooking(session.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={`Cancel session and refund ${session.totalCoins} Coins`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onLaunchSession(session)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all inline-flex items-center gap-1.5"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Launch Early
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
