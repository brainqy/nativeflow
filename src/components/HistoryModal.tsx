import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  Search,
  Calendar,
  MessageSquare,
  Award,
  Download,
  Trash2,
  Play,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Languages,
} from 'lucide-react';
import { SavedSession, DialogueMessage, SessionSummary } from '../types';
import {
  getSavedSessions,
  deleteSavedSession,
  clearAllSavedSessions,
  exportSessionAsMarkdown,
  triggerFileDownload,
} from '../utils/sessionStorage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSession: (session: SavedSession) => void;
  onViewSummary: (summary: SessionSummary, session: SavedSession) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onResumeSession,
  onViewSummary,
}) => {
  const [sessions, setSessions] = useState<SavedSession[]>(() => getSavedSessions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Refresh sessions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSessions(getSavedSessions());
    }
  }, [isOpen]);

  // Unique languages in saved sessions
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    sessions.forEach((s) => langs.add(s.targetLanguage));
    return Array.from(langs);
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesLang = selectedLanguage === 'all' || s.targetLanguage.toLowerCase() === selectedLanguage.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesLang;

      const matchesTitle = s.scenarioTitle.toLowerCase().includes(q);
      const matchesPersona = s.aiPersona.name.toLowerCase().includes(q);
      const matchesRole = s.learnerRole.toLowerCase().includes(q);
      const matchesContext = s.context.toLowerCase().includes(q);
      const matchesTranscript = s.messages.some((m) => m.text.toLowerCase().includes(q));

      return matchesLang && (matchesTitle || matchesPersona || matchesRole || matchesContext || matchesTranscript);
    });
  }, [sessions, selectedLanguage, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    let totalMessages = 0;
    let scoreSum = 0;
    let scoredCount = 0;

    sessions.forEach((s) => {
      totalMessages += s.messages.length;
      if (s.summary?.overallScore) {
        scoreSum += s.summary.overallScore;
        scoredCount++;
      }
    });

    const avgScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null;

    return { totalSessions, totalMessages, avgScore };
  }, [sessions]);

  // Delete handler
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedSession(id);
    setSessions(getSavedSessions());
    if (expandedSessionId === id) setExpandedSessionId(null);
    setConfirmDeleteId(null);
  };

  // Export Markdown handler
  const handleExportMarkdown = (session: SavedSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = exportSessionAsMarkdown(session);
    const safeTitle = session.scenarioTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `nativeflow-dialogue-${safeTitle}-${new Date(session.startedAt).toISOString().slice(0, 10)}.md`;
    triggerFileDownload(md, filename, 'text/markdown');
  };

  // Export JSON handler
  const handleExportJson = (session: SavedSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonStr = JSON.stringify(session, null, 2);
    const safeTitle = session.scenarioTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `nativeflow-session-${safeTitle}-${new Date(session.startedAt).toISOString().slice(0, 10)}.json`;
    triggerFileDownload(jsonStr, filename, 'application/json');
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = (session: SavedSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = session.messages
      .map((m) => `${m.role === 'user' ? 'YOU' : session.aiPersona.name}: ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedSessionId(session.id);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-100">
                  Practice History & Past Transcripts
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  {sessions.length} Sessions Saved
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Revisit prior conversations, review linguistic assessments, and export your dialogues.
              </p>
            </div>
          </div>

          <button
            id="btn-close-history"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Search Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 space-y-3">
          {/* Top Quick Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2 sm:p-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Sessions
              </span>
              <span className="text-base sm:text-xl font-extrabold text-slate-100 font-mono">
                {stats.totalSessions}
              </span>
            </div>
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2 sm:p-3">
              <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">
                Messages Logged
              </span>
              <span className="text-base sm:text-xl font-extrabold text-teal-300 font-mono">
                {stats.totalMessages}
              </span>
            </div>
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2 sm:p-3">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Avg. Fluency Score
              </span>
              <span className="text-base sm:text-xl font-extrabold text-amber-300 font-mono">
                {stats.avgScore ? `${stats.avgScore}%` : '—'}
              </span>
            </div>
          </div>

          {/* Search & Language Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, partner persona, role, or transcript text..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {availableLanguages.length > 1 && (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Languages className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-slate-950 text-slate-300 text-xs font-medium px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-teal-500 w-full sm:w-auto cursor-pointer"
                >
                  <option value="all">All Languages ({sessions.length})</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {filteredSessions.length === 0 ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400">
                <History className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="font-bold text-base text-slate-200">
                {searchQuery || selectedLanguage !== 'all'
                  ? 'No matching conversations found'
                  : 'No conversation history yet'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchQuery || selectedLanguage !== 'all'
                  ? 'Try adjusting your search query or language filter.'
                  : 'Complete a voice or studio practice dialogue with any native persona, and your transcripts along with linguistic feedback will automatically be archived here.'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isExpanded = expandedSessionId === session.id;
              const dateStr = new Date(session.startedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeStr = new Date(session.startedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const userTurnCount = session.messages.filter((m) => m.role === 'user').length;

              return (
                <div
                  key={session.id}
                  id={`session-card-${session.id}`}
                  className={`border rounded-xl transition-all duration-200 bg-slate-950/70 ${
                    isExpanded
                      ? 'border-teal-500/40 shadow-lg shadow-teal-950/20'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Session Card Header */}
                  <div
                    onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    className="p-3.5 sm:p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-slate-100">
                          {session.scenarioTitle}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          {session.targetLanguage}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {session.cefrLevel}
                        </span>
                        {session.summary?.overallScore && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>
                              {session.summary.overallRating ? `${session.summary.overallRating} (${session.summary.overallScore}%)` : `Score: ${session.summary.overallScore}%`}
                            </span>
                          </span>
                        )}
                        {session.summary?.hiringRecommendation && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                            {session.summary.hiringRecommendation}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {dateStr} at {timeStr}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          {userTurnCount} spoken turns ({session.messages.length} total)
                        </span>
                        <span>•</span>
                        <span>
                          Partner: <strong className="text-slate-300 font-semibold">{session.aiPersona.name}</strong> ({session.aiPersona.role})
                        </span>
                      </div>
                    </div>

                    {/* Actions on Card */}
                    <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResumeSession(session);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold border border-teal-500/30 transition-colors"
                        title="Resume or practice this conversation again"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Resume</span>
                      </button>

                      {session.summary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewSummary(session.summary!, session);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors"
                          title="View CEFR Oral Proficiency assessment report"
                        >
                          <Award className="w-3 h-3" />
                          <span className="hidden sm:inline">Assessment</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleExportMarkdown(session, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Export dialogue as Markdown file"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === session.id ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/40" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-rose-300 font-semibold px-1">Delete?</span>
                          <button
                            onClick={(e) => handleDelete(session.id, e)}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded"
                          >
                            Yes
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(session.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSessionId(isExpanded ? null : session.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                        title={isExpanded ? 'Collapse transcript' : 'Expand transcript'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Transcript Section */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 p-4 sm:p-5 bg-slate-950/90 space-y-4 animate-in fade-in duration-150">
                      {/* Transcript Actions Bar */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-teal-400" />
                          Turn-by-Turn Dialogue Transcript
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleCopyTranscript(session, e)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                          >
                            {copiedSessionId === session.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleExportMarkdown(session, e)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download .MD</span>
                          </button>

                          <button
                            onClick={(e) => handleExportJson(session, e)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                          >
                            <span>JSON</span>
                          </button>
                        </div>
                      </div>

                      {/* Dialogue Turns */}
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {session.messages.map((msg, idx) => {
                          const isUser = msg.role === 'user';
                          const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={msg.id || idx}
                              className={`p-3.5 rounded-xl text-xs sm:text-sm border transition-all ${
                                isUser
                                  ? 'bg-cyan-950/30 border-cyan-500/30 text-slate-100 ml-4 sm:ml-8'
                                  : 'bg-slate-900 border-slate-800 text-slate-200 mr-4 sm:mr-8'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span
                                  className={`text-[11px] font-bold tracking-wide uppercase ${
                                    isUser ? 'text-cyan-400' : 'text-teal-400'
                                  }`}
                                >
                                  {isUser ? `🗣️ You (${session.learnerRole})` : `🤖 ${session.aiPersona.name}`}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                              </div>

                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                              {msg.translation && (
                                <p className="mt-2 text-xs text-slate-400 italic pt-2 border-t border-slate-800/80">
                                  {msg.translation}
                                </p>
                              )}

                              {/* Native Expressions in turn */}
                              {msg.nativeExpressionsUsed && msg.nativeExpressionsUsed.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-amber-400 uppercase">Native Idioms:</span>
                                  {msg.nativeExpressionsUsed.map((exp, i) => (
                                    <span
                                      key={i}
                                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                      title={exp.meaning}
                                    >
                                      {exp.phrase}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Turn Linguistic Feedback */}
                              {msg.feedback && (
                                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-teal-300">
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center gap-1 font-bold">
                                        <Sparkles className="w-3 h-3 text-teal-400" />
                                        Score: {msg.feedback.score ?? msg.feedback.fluencyScore ?? 75}/100
                                      </span>
                                      {msg.feedback.rating && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                                          {msg.feedback.rating}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-slate-400 font-normal">
                                      {msg.feedback.detectedCefrLevel}
                                    </span>
                                  </div>

                                  {msg.feedback.tags && msg.feedback.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {msg.feedback.tags.map((t, tIdx) => (
                                        <span key={tIdx} className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {msg.feedback.idealAnswerElevated && (
                                    <div className="text-[11px] text-teal-200 bg-teal-950/30 p-1.5 rounded border border-teal-500/20 mt-1">
                                      <span className="text-teal-400 font-semibold block text-[10px] uppercase">
                                        Interview-Ready Delivery:
                                      </span>
                                      "{msg.feedback.idealAnswerElevated}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Transcripts are stored privately in local browser storage.</span>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all saved conversation transcripts?')) {
                  clearAllSavedSessions();
                  setSessions([]);
                }
              }}
              className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
            >
              Clear All History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
