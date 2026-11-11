import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Volume2,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Award,
  Target,
  BookOpen,
  Check,
  Zap,
} from 'lucide-react';
import { TurnFeedback, OverallRating, RecruiterDimension } from '../types';
import { playSinglePcmAudio } from '../utils/audioUtils';

interface InlineFeedbackModalProps {
  feedback: TurnFeedback | null;
  userUtterance: string;
  onClose: () => void;
  targetLanguage: string;
}

export const InlineFeedbackModal: React.FC<InlineFeedbackModalProps> = ({
  feedback,
  userUtterance,
  onClose,
  targetLanguage,
}) => {
  const [isPlayingTts, setIsPlayingTts] = useState<string | null>(null);
  const [showLinguisticDetails, setShowLinguisticDetails] = useState(false);

  if (!feedback) return null;

  const score = feedback.score ?? feedback.fluencyScore ?? 75;
  const rating: OverallRating = feedback.rating || (score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : score >= 60 ? 'Average' : score >= 45 ? 'Weak' : 'Poor');

  const getRatingBadgeStyle = (r: OverallRating) => {
    switch (r) {
      case 'Excellent':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Strong':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Good':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Average':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Weak':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Poor':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getDimensionStatusStyle = (status?: string) => {
    if (status === 'strength') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (status === 'needs_work') return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  };

  const handlePlayAudio = async (text: string) => {
    try {
      setIsPlayingTts(text);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Fenrir' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playSinglePcmAudio(data.audioBase64);
        }
      }
    } catch (e) {
      console.warn('TTS playback error:', e);
    } finally {
      setIsPlayingTts(null);
    }
  };

  const positiveTags = feedback.positiveTags || [];
  const improvementTags = feedback.improvementTags || [];
  const allTags = feedback.tags && feedback.tags.length > 0 ? feedback.tags : [...positiveTags, ...improvementTags];

  const strengths = feedback.strengths && feedback.strengths.length > 0 
    ? feedback.strengths 
    : (feedback.positiveAspects || ['Demonstrated clear intention and core domain relevance.']);

  const improvements = feedback.improvements && feedback.improvements.length > 0 
    ? feedback.improvements 
    : ['Incorporate quantified examples and compare with alternative approaches to increase impact.'];

  const dims = feedback.dimensions;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Interview Answer Evaluation
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {targetLanguage}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Multi-dimensional recruiter feedback & answer quality breakdown
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate's Spoken Input Box */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Your Spoken Response
            </span>
            {feedback.detectedCefrLevel && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {feedback.detectedCefrLevel}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 italic">"{userUtterance}"</p>
        </div>

        {/* Hero Score + Rating Card */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-950/90 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Score
              </span>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-400">
                {score}<span className="text-sm font-semibold text-slate-500">/100</span>
              </div>
            </div>

            <div className="h-9 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Overall Rating
              </span>
              <span className={`text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full border ${getRatingBadgeStyle(rating)} shadow-sm`}>
                {rating}
              </span>
            </div>
          </div>

          {/* Tags Ribbon */}
          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-end max-w-sm">
            {allTags.map((tag, idx) => {
              const isPositive = positiveTags.includes(tag);
              const isImprovement = improvementTags.includes(tag);
              return (
                <span
                  key={idx}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    isImprovement
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : isPositive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        {/* Strengths & Improvements Side-by-Side / Stacked */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strengths */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Strengths</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Target Improvements</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {improvements.map((imp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 5 Recruiter Dimensions Breakdown */}
        {dims && (
          <div className="mt-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>Recruiter Dimensions Evaluation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(dims).map(([key, rawDim]) => {
                const dim = rawDim as RecruiterDimension | undefined;
                if (!dim) return null;
                return (
                  <div
                    key={key}
                    className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200">{dim.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDimensionStatusStyle(dim.status)}`}>
                        {dim.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${dim.score >= 80 ? 'bg-teal-400' : dim.score >= 65 ? 'bg-cyan-400' : 'bg-amber-400'}`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {dim.score}%
                      </span>
                    </div>

                    {dim.feedback && (
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {dim.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ideal Interview-Ready Refinement */}
        {feedback.idealAnswerElevated && (
          <div className="mt-4 bg-teal-950/30 border border-teal-500/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive / Interview-Ready Delivery</span>
              </span>

              <button
                onClick={() => handlePlayAudio(feedback.idealAnswerElevated!)}
                disabled={isPlayingTts === feedback.idealAnswerElevated}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded border border-teal-500/30 transition-colors"
                title="Hear model articulation"
              >
                {isPlayingTts === feedback.idealAnswerElevated ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
                <span>Listen</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed font-medium bg-slate-950/40 p-2.5 rounded-lg border border-teal-500/20">
              "{feedback.idealAnswerElevated}"
            </p>
          </div>
        )}

        {/* Linguistic Refinements Toggle & Section */}
        {((feedback.nativeRefinements && feedback.nativeRefinements.length > 0) || (feedback.grammarAndCollocations && feedback.grammarAndCollocations.length > 0)) && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowLinguisticDetails(!showLinguisticDetails)}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-between w-full p-2 rounded-lg bg-slate-800/40 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Grammar, Collocation & Native Phrasing Details</span>
              </span>
              <span className="text-[10px] text-teal-400">
                {showLinguisticDetails ? 'Hide' : 'Show Details'}
              </span>
            </button>

            {showLinguisticDetails && (
              <div className="mt-3 space-y-3">
                {feedback.nativeRefinements && feedback.nativeRefinements.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                      Native Alternatives
                    </span>
                    {feedback.nativeRefinements.map((ref, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-teal-500/30 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 line-through">"{ref.originalPart}"</span>
                            <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                            <span className="font-bold text-teal-300">"{ref.nativeAlternative}"</span>
                          </div>

                          <button
                            onClick={() => handlePlayAudio(ref.nativeAlternative)}
                            disabled={isPlayingTts === ref.nativeAlternative}
                            className="p-1 rounded text-teal-300 hover:bg-teal-500/20"
                            title="Pronounce"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-300 text-[11px] pl-2 border-l-2 border-teal-500/40">
                          {ref.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {feedback.grammarAndCollocations && feedback.grammarAndCollocations.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      Grammar Notes
                    </span>
                    {feedback.grammarAndCollocations.map((item, idx) => (
                      <div key={idx} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-2.5 text-xs space-y-1">
                        <div className="font-semibold text-slate-200">
                          <span className="text-rose-300">{item.issue}</span> → <span className="text-emerald-300 font-bold">{item.correction}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{item.ruleNuance}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Close CTA */}
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
          >
            Close Evaluation
          </button>
        </div>
      </div>
    </div>
  );
};
