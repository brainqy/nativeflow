import React, { useState } from 'react';
import {
  X,
  Award,
  Download,
  CheckCircle2,
  TrendingUp,
  Brain,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Target,
  Zap,
  Briefcase,
  MessageSquare,
  HelpCircle,
  Activity,
  Layers,
  Compass,
  BarChart3,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { SessionSummary, ConversationScenario, DialogueMessage, OverallRating } from '../types';
import { getSavedSessions } from '../utils/sessionStorage';

interface RadarDimension {
  key: string;
  label: string;
  score: number;
  benchmark?: number;
}

const RadarChart: React.FC<{
  dimensions: RadarDimension[];
  size?: number;
  secondaryScores?: number[];
  secondaryLabel?: string;
}> = ({ dimensions, size = 280, secondaryScores, secondaryLabel }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const count = dimensions.length;

  const getCoordinates = (value: number, index: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const levels = [20, 40, 60, 80, 100];

  const benchmarkPoints = dimensions
    .map((d, i) => {
      const { x, y } = getCoordinates(d.benchmark ?? 80, i);
      return `${x},${y}`;
    })
    .join(' ');

  const candidatePoints = dimensions
    .map((d, i) => {
      const { x, y } = getCoordinates(d.score, i);
      return `${x},${y}`;
    })
    .join(' ');

  const secondaryPoints = secondaryScores
    ? dimensions
        .map((_, i) => {
          const { x, y } = getCoordinates(secondaryScores[i] ?? 70, i);
          return `${x},${y}`;
        })
        .join(' ')
    : null;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Concentric Grid Pentagons */}
        {levels.map((lvl) => {
          const pts = dimensions
            .map((_, i) => {
              const { x, y } = getCoordinates(lvl, i);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="#334155"
              strokeWidth={lvl === 100 ? '1.5' : '1'}
              strokeDasharray={lvl === 100 ? undefined : '2,3'}
              opacity="0.8"
            />
          );
        })}

        {/* Radial Axis Lines */}
        {dimensions.map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              opacity="0.8"
            />
          );
        })}

        {/* Benchmark Shape (80% Bar Raiser Target) */}
        <polygon
          points={benchmarkPoints}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4,3"
          opacity="0.75"
        />

        {/* Secondary Historical Points if provided */}
        {secondaryPoints && (
          <polygon
            points={secondaryPoints}
            fill="none"
            stroke="#c084fc"
            strokeWidth="1.5"
            strokeDasharray="3,3"
            opacity="0.85"
          />
        )}

        {/* Candidate Score Polygon */}
        <polygon
          points={candidatePoints}
          fill="url(#radarFillGrad)"
          stroke="#14b8a6"
          strokeWidth="2.5"
        />

        {/* Vertex Points & Labels */}
        {dimensions.map((dim, i) => {
          const pt = getCoordinates(dim.score, i);
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          const labelDist = radius + 22;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle);

          return (
            <g key={dim.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#2dd4bf"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <text
                x={lx}
                y={ly - 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-slate-300 font-semibold"
                style={{ fontSize: '10px' }}
              >
                {dim.label}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono font-bold"
                fill={dim.score >= 75 ? '#2dd4bf' : '#fbbf24'}
                style={{ fontSize: '9px' }}
              >
                {dim.score}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 mt-2 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 bg-teal-400 rounded-sm" />
          <span>This Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-sky-400" />
          <span>Bar Raiser Target (80%)</span>
        </div>
        {secondaryLabel && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-purple-400" />
            <span>{secondaryLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SessionSummaryModalProps {
  summary: SessionSummary | null;
  scenario: ConversationScenario | null;
  messages: DialogueMessage[];
  onClose: () => void;
  onRestart: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  summary,
  scenario,
  messages,
  onClose,
  onRestart,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'overall'>('scorecard');

  if (!summary) return null;

  // Pair up Question (model) and Answer (user) exchanges from the interview dialogue
  interface QAPair {
    pairId: string;
    questionNumber: number;
    questionText: string;
    questionTime: number;
    interviewerName: string;
    answerText?: string;
    answerTime?: number;
    feedback?: any;
  }

  const qaPairs: QAPair[] = [];
  let currentPair: QAPair | null = null;
  let qIndex = 0;

  for (const msg of messages) {
    if (msg.role === 'model') {
      qIndex++;
      currentPair = {
        pairId: `qa-${qIndex}-${msg.id}`,
        questionNumber: qIndex,
        questionText: msg.text,
        questionTime: msg.timestamp,
        interviewerName: scenario?.aiPersona?.name || 'Alex Vance',
      };
      qaPairs.push(currentPair);
    } else if (msg.role === 'user') {
      if (currentPair && !currentPair.answerText) {
        currentPair.answerText = msg.text;
        currentPair.answerTime = msg.timestamp;
        currentPair.feedback = msg.feedback;
      } else {
        qIndex = Math.max(1, qIndex);
        qaPairs.push({
          pairId: `qa-user-${msg.id}`,
          questionNumber: qIndex,
          questionText: `Interview Dialogue Follow-up`,
          questionTime: msg.timestamp - 5000,
          interviewerName: scenario?.aiPersona?.name || 'Alex Vance',
          answerText: msg.text,
          answerTime: msg.timestamp,
          feedback: msg.feedback,
        });
      }
    }
  }

  const score = summary.overallScore ?? 75;
  const rating: OverallRating = summary.overallRating || summary.rating || (score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : score >= 60 ? 'Average' : score >= 45 ? 'Weak' : 'Poor');

  const getRatingBadgeStyle = (r: OverallRating) => {
    switch (r) {
      case 'Excellent':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10';
      case 'Strong':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-teal-500/10';
      case 'Good':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10';
      case 'Average':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10';
      case 'Weak':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/10';
      case 'Poor':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10';
    }
  };

  const getHiringBadgeStyle = (h?: string) => {
    switch (h) {
      case 'Strong Hire':
        return 'bg-emerald-500 text-slate-950 font-black';
      case 'Hire':
        return 'bg-teal-400 text-slate-950 font-bold';
      case 'Lean Hire':
        return 'bg-cyan-400/90 text-slate-950 font-semibold';
      case 'Lean No Hire':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      case 'No Hire':
      default:
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
    }
  };

  const handleCopyNotes = () => {
    const markdown = `# Interview Assessment & Performance Scorecard
**Topic / Scenario**: ${scenario?.title || 'Professional Interview Practice'}
**Target Language**: ${scenario?.targetLanguage} (${scenario?.cefrLevel})
**Overall Score**: ${score}/100
**Overall Rating**: ${rating}
**Hiring Recommendation**: ${summary.hiringRecommendation || (score >= 80 ? 'Hire' : score >= 70 ? 'Lean Hire' : 'Lean No Hire')}
**CEFR Attained**: ${summary.cefrAttained}

## Answer Quality & Recruiter Tags
${(summary.overallTags || []).map((t) => `\`${t}\``).join('  ')}

## Key Strengths
${(summary.keyStrengths || []).map((s) => `- ${s}`).join('\n')}

## Priority Improvements
${(summary.priorityImprovements || summary.personalizedPracticeRecommendations || []).map((p) => `- ${p}`).join('\n')}

## 5 Recruiter Dimensions
- **Content Quality**: ${summary.dimensionScores.contentQuality}% (${summary.dimensionBreakdown?.contentQuality?.label || 'Relevant'})
- **Clarity & Communication**: ${summary.dimensionScores.clarityAndCommunication}% (${summary.dimensionBreakdown?.clarityAndCommunication?.label || 'Clear'})
- **Depth of Knowledge**: ${summary.dimensionScores.depthOfKnowledge}% (${summary.dimensionBreakdown?.depthOfKnowledge?.label || 'Demonstrates Strong Understanding'})
- **Examples & Evidence**: ${summary.dimensionScores.examplesAndEvidence}% (${summary.dimensionBreakdown?.examplesAndEvidence?.label || 'Supported'})
- **Problem-Solving**: ${summary.dimensionScores.problemSolving}% (${summary.dimensionBreakdown?.problemSolving?.label || 'Structured Approach'})

## Executive Recruiter Debrief
${summary.executiveSummary}
`;

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify({ summary, scenario, messages }, null, 2)], {
      type: 'application/json',
    });
    element.href = URL.createObjectURL(file);
    element.download = `Interview-Scorecard-${scenario?.targetLanguage || 'Language'}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const dimList = [
    {
      key: 'contentQuality',
      name: 'Content Quality',
      score: summary.dimensionScores.contentQuality,
      label: summary.dimensionBreakdown?.contentQuality?.label || (summary.dimensionScores.contentQuality >= 80 ? 'Accurate & Detailed' : 'Relevant'),
      feedback: summary.dimensionBreakdown?.contentQuality?.feedback,
      barColor: 'bg-teal-400',
    },
    {
      key: 'clarityAndCommunication',
      name: 'Clarity & Communication',
      score: summary.dimensionScores.clarityAndCommunication,
      label: summary.dimensionBreakdown?.clarityAndCommunication?.label || (summary.dimensionScores.clarityAndCommunication >= 80 ? 'Well-Structured' : 'Clear'),
      feedback: summary.dimensionBreakdown?.clarityAndCommunication?.feedback,
      barColor: 'bg-cyan-400',
    },
    {
      key: 'depthOfKnowledge',
      name: 'Depth of Knowledge',
      score: summary.dimensionScores.depthOfKnowledge,
      label: summary.dimensionBreakdown?.depthOfKnowledge?.label || (summary.dimensionScores.depthOfKnowledge >= 80 ? 'Advanced-Level' : 'Intermediate-Level'),
      feedback: summary.dimensionBreakdown?.depthOfKnowledge?.feedback,
      barColor: 'bg-emerald-400',
    },
    {
      key: 'examplesAndEvidence',
      name: 'Examples & Evidence',
      score: summary.dimensionScores.examplesAndEvidence,
      label: summary.dimensionBreakdown?.examplesAndEvidence?.label || (summary.dimensionScores.examplesAndEvidence >= 75 ? 'Strong Examples' : 'Needs Quantified Impact'),
      feedback: summary.dimensionBreakdown?.examplesAndEvidence?.feedback,
      barColor: 'bg-amber-400',
    },
    {
      key: 'problemSolving',
      name: 'Problem-Solving',
      score: summary.dimensionScores.problemSolving,
      label: summary.dimensionBreakdown?.problemSolving?.label || (summary.dimensionScores.problemSolving >= 80 ? 'Solution-Oriented' : 'Structured Approach'),
      feedback: summary.dimensionBreakdown?.problemSolving?.feedback,
      barColor: 'bg-indigo-400',
    },
  ];

  const positiveTags = summary.positiveTags || [];
  const improvementTags = summary.improvementTags || [];
  const tags = summary.overallTags && summary.overallTags.length > 0 ? summary.overallTags : [...positiveTags, ...improvementTags];

  const keyStrengths = summary.keyStrengths && summary.keyStrengths.length > 0 
    ? summary.keyStrengths 
    : ['Articulated core principles with domain-specific terminology.', 'Maintained steady conversational pacing and confidence.'];

  const priorityImprovements = summary.priorityImprovements && summary.priorityImprovements.length > 0
    ? summary.priorityImprovements
    : (summary.personalizedPracticeRecommendations || ['Back up claims with quantitative production metrics.', 'Address potential architectural bottlenecks.']);

  // 5 Radar Dimensions for SVG Radar Chart
  const radarDimensions: RadarDimension[] = [
    { key: 'contentQuality', label: 'Content Quality', score: summary.dimensionScores.contentQuality, benchmark: 80 },
    { key: 'clarityAndCommunication', label: 'Clarity', score: summary.dimensionScores.clarityAndCommunication, benchmark: 80 },
    { key: 'depthOfKnowledge', label: 'Technical Depth', score: summary.dimensionScores.depthOfKnowledge, benchmark: 80 },
    { key: 'examplesAndEvidence', label: 'Evidence & Metrics', score: summary.dimensionScores.examplesAndEvidence, benchmark: 80 },
    { key: 'problemSolving', label: 'Problem Solving', score: summary.dimensionScores.problemSolving, benchmark: 80 },
  ];

  // Strong Areas (>= 75%) vs Weak / Priority Focus Areas (< 75%)
  const strongAreas = dimList.filter((d) => d.score >= 75);
  const weakAreas = dimList.filter((d) => d.score < 75);

  // Focus Tags explicitly addressing where the candidate must focus to improve
  const focusAreasTags: string[] = [];
  if (summary.dimensionScores.examplesAndEvidence < 75) {
    focusAreasTags.push('Quantify Production Metrics (QPS, P99 Latency, MTTR)');
    focusAreasTags.push('Cite Specific High-Volume Case Studies');
  }
  if (summary.dimensionScores.contentQuality < 75) {
    focusAreasTags.push('Deeper Architecture Design Patterns');
    focusAreasTags.push('Cover System Resiliency & Failure Modes');
  }
  if (summary.dimensionScores.clarityAndCommunication < 75) {
    focusAreasTags.push('Structure Responses with STAR / CAR Framework');
    focusAreasTags.push('State Executive Bottom-Line First');
  }
  if (summary.dimensionScores.depthOfKnowledge < 75) {
    focusAreasTags.push('Articulate Architectural Trade-Offs Explicitly');
    focusAreasTags.push('Detail Lower-Level Runtime & Kernel Mechanics');
  }
  if (summary.dimensionScores.problemSolving < 75) {
    focusAreasTags.push('Methodical Step-by-Step Diagnostics Breakdown');
    focusAreasTags.push('Include Observability & Telemetry Signals');
  }
  if (focusAreasTags.length === 0) {
    focusAreasTags.push('Maintain High-Level Architecture Precision');
    focusAreasTags.push('Drive Executive C-Level Persuasion');
  }

  // Historical Sessions Aggregation for Overall Progress Report Card
  const savedSessions = getSavedSessions();
  const allSessionsWithSummary = savedSessions.filter((s) => s.summary);
  const allScores = [score, ...allSessionsWithSummary.map((s) => s.summary?.overallScore || 75)];
  const averageAllTimeScore = Math.round(allScores.reduce((a, b) => a + b, 0) / Math.max(1, allScores.length));
  const oldestScore = allScores[allScores.length - 1];
  const scoreTrendPercent = score - oldestScore;
  const highestScore = Math.max(...allScores);

  // All-Time Average Dimensions for Historical Radar
  const avgDimensions: RadarDimension[] = [
    {
      key: 'contentQuality',
      label: 'Content Quality',
      score: Math.round(
        [summary.dimensionScores.contentQuality, ...allSessionsWithSummary.map((s) => s.summary?.dimensionScores?.contentQuality || 75)].reduce((a, b) => a + b, 0) /
          Math.max(1, allSessionsWithSummary.length + 1)
      ),
      benchmark: 80,
    },
    {
      key: 'clarityAndCommunication',
      label: 'Clarity',
      score: Math.round(
        [summary.dimensionScores.clarityAndCommunication, ...allSessionsWithSummary.map((s) => s.summary?.dimensionScores?.clarityAndCommunication || 75)].reduce((a, b) => a + b, 0) /
          Math.max(1, allSessionsWithSummary.length + 1)
      ),
      benchmark: 80,
    },
    {
      key: 'depthOfKnowledge',
      label: 'Technical Depth',
      score: Math.round(
        [summary.dimensionScores.depthOfKnowledge, ...allSessionsWithSummary.map((s) => s.summary?.dimensionScores?.depthOfKnowledge || 75)].reduce((a, b) => a + b, 0) /
          Math.max(1, allSessionsWithSummary.length + 1)
      ),
      benchmark: 80,
    },
    {
      key: 'examplesAndEvidence',
      label: 'Evidence & Metrics',
      score: Math.round(
        [summary.dimensionScores.examplesAndEvidence, ...allSessionsWithSummary.map((s) => s.summary?.dimensionScores?.examplesAndEvidence || 75)].reduce((a, b) => a + b, 0) /
          Math.max(1, allSessionsWithSummary.length + 1)
      ),
      benchmark: 80,
    },
    {
      key: 'problemSolving',
      label: 'Problem Solving',
      score: Math.round(
        [summary.dimensionScores.problemSolving, ...allSessionsWithSummary.map((s) => s.summary?.dimensionScores?.problemSolving || 75)].reduce((a, b) => a + b, 0) /
          Math.max(1, allSessionsWithSummary.length + 1)
      ),
      benchmark: 80,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-amber-400 p-[2px] shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Recruiter Interview Scorecard
              </h2>
              <p className="text-xs text-slate-400">
                Evaluation for <span className="text-teal-300 font-semibold">{scenario?.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
              title="Copy notes as markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Scorecard'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs: This Session Scorecard vs Overall Progress & Mastery Hub */}
        <div className="flex items-center gap-2 my-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'scorecard'
                ? 'text-teal-400 border-teal-400 bg-teal-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>This Session Scorecard & Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('overall')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overall'
                ? 'text-purple-400 border-purple-400 bg-purple-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Overall Progress & Mastery Card</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
              {allScores.length} Sessions
            </span>
          </button>
        </div>

        {activeTab === 'scorecard' ? (
          <>
            {/* Hero Scorecard Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 my-5">
              {/* Overall Score */}
              <div className="bg-slate-950/70 border border-teal-500/30 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-lg shadow-teal-500/5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Overall Score
                </span>
                <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
                  {score}
                  <span className="text-base text-slate-500">/100</span>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Overall Rating
                </span>
                <span className={`text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full border ${getRatingBadgeStyle(rating)}`}>
                  {rating}
                </span>
              </div>

              {/* Hiring Recommendation */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Recommendation
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getHiringBadgeStyle(summary.hiringRecommendation || (score >= 80 ? 'Hire' : score >= 70 ? 'Lean Hire' : 'Lean No Hire'))}`}>
                  {summary.hiringRecommendation || (score >= 80 ? 'Hire' : score >= 70 ? 'Lean Hire' : 'Lean No Hire')}
                </span>
              </div>

              {/* CEFR Benchmark */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  CEFR Benchmark
                </span>
                <div className="text-sm font-extrabold text-amber-300 line-clamp-1">
                  {summary.cefrAttained || 'C1 Advanced'}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {messages.filter((m) => m.role === 'user').length} Spoken Turns
                </span>
              </div>
            </div>

            {/* RADAR CHART & PROFICIENCY ANALYSIS (STRONG VS WEAK AREAS) */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                      Recruiter Evaluation Radar Chart & Proficiency Matrix
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Multi-dimensional performance mapped against the Senior / Staff Bar Raiser Benchmark (80%).
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/40 px-2.5 py-1 rounded-full border border-teal-500/30">
                  5 Core Dimensions
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left: SVG Radar Chart (7 cols) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <RadarChart dimensions={radarDimensions} size={290} />
                </div>

                {/* Right: Strong Areas vs Weak / Priority Focus Areas (5 cols) */}
                <div className="lg:col-span-5 space-y-3.5">
                  {/* Strong Proficiency Areas */}
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Strong Proficiency Areas ({strongAreas.length})</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                        ≥ 75%
                      </span>
                    </div>

                    {strongAreas.length > 0 ? (
                      <div className="space-y-1.5">
                        {strongAreas.map((dim) => (
                          <div key={dim.key} className="flex items-center justify-between text-xs bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                            <span className="font-semibold text-slate-200">{dim.name}</span>
                            <span className="font-mono font-bold text-emerald-300">{dim.score}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Continue practicing to push core dimensions above 75%.</p>
                    )}
                  </div>

                  {/* Weak / Priority Focus Areas */}
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Priority Improvement Areas ({weakAreas.length})</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                        &lt; 75%
                      </span>
                    </div>

                    {weakAreas.length > 0 ? (
                      <div className="space-y-1.5">
                        {weakAreas.map((dim) => (
                          <div key={dim.key} className="flex items-center justify-between text-xs bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                            <span className="font-semibold text-slate-200">{dim.name}</span>
                            <span className="font-mono font-bold text-amber-300">{dim.score}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-300 font-semibold p-1">
                        ✓ Exceptional! All dimensions met or exceeded the 75% bar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONABLE FOCUS TAGS RIBBON: IN WHICH AREA USER SHOULD FOCUS */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-teal-950/30 border border-purple-500/30 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                    Targeted Practice Focus: Which Areas to Focus on Next
                  </span>
                </div>
                <span className="text-[11px] text-purple-300/80 font-semibold">
                  Personalized High-Leverage Improvements
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {focusAreasTags.map((tag, fIdx) => (
                  <span
                    key={fIdx}
                    className="text-xs font-semibold px-3 py-1 rounded-xl bg-purple-500/15 text-purple-200 border border-purple-500/30 shadow-sm flex items-center gap-1.5 hover:bg-purple-500/25 transition-colors"
                  >
                    <span>🎯</span>
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>

        {/* Answer Quality & Recruiter Tags Ribbon */}
        {tags && tags.length > 0 && (
          <div className="mb-5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Recruiter Evaluation Tags:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => {
                const isPositive = positiveTags.includes(tag);
                const isImprovement = improvementTags.includes(tag);
                return (
                  <span
                    key={idx}
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
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
        )}

        {/* 5 Recruiter Dimensions Matrix */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-teal-400" />
            <span>Recruiter Evaluation Dimensions</span>
          </h3>

          <div className="space-y-3">
            {dimList.map((dim) => (
              <div key={dim.key} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{dim.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                      {dim.label}
                    </span>
                    <span className="font-mono font-bold text-slate-100">{dim.score}%</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${dim.barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>

                {dim.feedback && (
                  <p className="text-[11px] text-slate-400 pl-1 leading-snug">
                    {dim.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Priority Improvements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Key Strengths */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Key Strengths ({keyStrengths.length})</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {keyStrengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Priority Improvements */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>Priority Improvements Roadmap</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {priorityImprovements.map((imp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">→</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Executive Recruiter Summary */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 mb-6">
          <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Brain className="w-4 h-4" />
            <span>Executive Recruiter Debrief</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {summary.executiveSummary}
          </p>
        </div>

        {/* Question & Answer Transcript with Scores & Evaluated Attributes */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Question & Answer Transcript with Performance Attributes
                </h3>
                <p className="text-[11px] text-slate-400">
                  Full transcript of questions asked, candidate responses, turn scores, and recruiter evaluation dimensions.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-teal-300 bg-teal-950/40 px-3 py-1 rounded-full border border-teal-500/30">
              {qaPairs.length} Question Exchange(s)
            </span>
          </div>

          {qaPairs.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 text-center">
              No interview dialogue recorded for this session.
            </p>
          ) : (
            <div className="space-y-4">
              {qaPairs.map((pair) => {
                const turnScore = pair.feedback?.score ?? pair.feedback?.fluencyScore ?? summary.overallScore ?? 75;
                const turnRating: OverallRating =
                  pair.feedback?.rating ||
                  (turnScore >= 90
                    ? 'Excellent'
                    : turnScore >= 80
                    ? 'Strong'
                    : turnScore >= 70
                    ? 'Good'
                    : turnScore >= 60
                    ? 'Average'
                    : 'Weak');

                const turnTags = pair.feedback?.tags && pair.feedback.tags.length > 0
                  ? pair.feedback.tags
                  : summary.overallTags || ['Clear Structure', 'Relevant Experience'];

                const turnDimensions = pair.feedback?.dimensions || {
                  contentQuality: { score: summary.dimensionScores.contentQuality, label: 'Content' },
                  clarityAndCommunication: { score: summary.dimensionScores.clarityAndCommunication, label: 'Clarity' },
                  depthOfKnowledge: { score: summary.dimensionScores.depthOfKnowledge, label: 'Depth' },
                  examplesAndEvidence: { score: summary.dimensionScores.examplesAndEvidence, label: 'Examples' },
                  problemSolving: { score: summary.dimensionScores.problemSolving, label: 'Problem Solving' },
                };

                return (
                  <div
                    key={pair.pairId}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3.5 hover:border-slate-700/80 transition-all"
                  >
                    {/* Header: Question Number & Turn Score */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 font-extrabold text-xs border border-teal-500/30 font-mono">
                          QUESTION {pair.questionNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {pair.interviewerName} (Interviewer)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">
                          Turn Score: <span className="text-teal-300 font-mono">{turnScore}/100</span>
                        </span>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getRatingBadgeStyle(turnRating)}`}>
                          {turnRating}
                        </span>
                      </div>
                    </div>

                    {/* Question Box */}
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400 mb-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Question Asked:</span>
                      </div>
                      <p className="whitespace-pre-wrap">{pair.questionText}</p>
                    </div>

                    {/* Candidate Answer Box */}
                    <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/20 text-xs sm:text-sm text-teal-100 leading-relaxed">
                      <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-cyan-400 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5" />
                          <span>Candidate's Spoken Answer:</span>
                        </span>
                        {pair.answerTime && (
                          <span className="text-[10px] text-slate-500 font-mono font-normal">
                            {new Date(pair.answerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {pair.answerText ? (
                        <p className="whitespace-pre-wrap">{pair.answerText}</p>
                      ) : (
                        <p className="text-slate-500 italic">No verbal response captured for this turn.</p>
                      )}
                    </div>

                    {/* Related Evaluated Attributes & Tags */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Evaluated Attributes & Recruiter Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {turnTags.map((tag: string, tIdx: number) => {
                          const isPositive = (pair.feedback?.positiveTags || []).includes(tag) || !((pair.feedback?.improvementTags || []).includes(tag));
                          return (
                            <span
                              key={tIdx}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                isPositive
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5 Core Dimensions Mini-Bar Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Content Quality</span>
                        <span className="font-bold text-teal-300 font-mono">{turnDimensions.contentQuality?.score ?? summary.dimensionScores.contentQuality}%</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Clarity</span>
                        <span className="font-bold text-cyan-300 font-mono">{turnDimensions.clarityAndCommunication?.score ?? summary.dimensionScores.clarityAndCommunication}%</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Depth</span>
                        <span className="font-bold text-emerald-300 font-mono">{turnDimensions.depthOfKnowledge?.score ?? summary.dimensionScores.depthOfKnowledge}%</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Evidence</span>
                        <span className="font-bold text-teal-300 font-mono">{turnDimensions.examplesAndEvidence?.score ?? summary.dimensionScores.examplesAndEvidence}%</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 block font-medium">Problem Solving</span>
                        <span className="font-bold text-purple-300 font-mono">{turnDimensions.problemSolving?.score ?? summary.dimensionScores.problemSolving}%</span>
                      </div>
                    </div>

                    {/* Actionable Recommendations for this Turn */}
                    {pair.feedback?.improvements && pair.feedback.improvements.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200">
                        <span className="font-bold text-amber-300 block mb-1">💡 Coaching Tip to Elevate This Answer:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                          {pair.feedback.improvements.map((imp: string, impIdx: number) => (
                            <li key={impIdx}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enterprise AI Proctoring & Anti-Cheat Audit */}
        {summary.proctoringAudit && (
          <div className="mb-6 p-4 rounded-xl bg-slate-950/70 border border-teal-500/30 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  AI Proctoring & Anti-Cheat Audit
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  summary.proctoringAudit.integrityScore >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : summary.proctoringAudit.integrityScore >= 75
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {summary.proctoringAudit.integrityScore}% Integrity Score
                </span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {summary.proctoringAudit.overallIntegrityRating}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Government ID Verification
                </span>
                <span className="text-emerald-300 font-bold block mt-0.5 truncate">
                  {summary.proctoringAudit.idVerified ? '✓ Identity Verified' : 'Standard Check'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {summary.proctoringAudit.idCardType || 'Official Credential'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Eye-Gaze Screen Fixation
                </span>
                <span className="text-teal-300 font-bold block mt-0.5">
                  {summary.proctoringAudit.gazeCompliancePercent}% On-Screen
                </span>
                <span className="text-[10px] text-slate-500 block">
                  5-Point Boundary Matrix
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Focus Lockout Breaches
                </span>
                <span className={`font-bold block mt-0.5 ${
                  summary.proctoringAudit.windowBlurCount > 0 ? 'text-amber-400' : 'text-emerald-300'
                }`}>
                  {summary.proctoringAudit.windowBlurCount} Tab/App Switches
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {summary.proctoringAudit.strikesTotal} Strike(s) Incurred
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Dual-Channel Audio Integrity
                </span>
                <span className={`font-bold block mt-0.5 ${
                  summary.proctoringAudit.systemAudioLeakCount > 0 || summary.proctoringAudit.whisperIncidentCount > 0
                    ? 'text-amber-400'
                    : 'text-emerald-300'
                }`}>
                  {summary.proctoringAudit.whisperIncidentCount} Whispers • {summary.proctoringAudit.systemAudioLeakCount} System Leaks
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Acoustic Guard Active
                </span>
              </div>
            </div>

            {/* Incidents Table if any */}
            {summary.proctoringAudit.incidents && summary.proctoringAudit.incidents.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recorded Integrity Incident Log ({summary.proctoringAudit.incidents.length}):
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {summary.proctoringAudit.incidents.map((inc, iIdx) => (
                    <div
                      key={iIdx}
                      className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-200">{inc.title}</span>
                        <span className="text-slate-400 ml-2">"{inc.description}"</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mastered Native Expressions & Vocabulary */}
        {summary.masteredNativeExpressions && summary.masteredNativeExpressions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Award className="w-4 h-4" />
              <span>Mastered Idioms & Native Expressions ({summary.masteredNativeExpressions.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {summary.masteredNativeExpressions.map((exp, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-emerald-500/20 rounded-xl p-3 text-xs"
                >
                  <div className="font-bold text-emerald-300 mb-0.5">{exp.phrase}</div>
                  <div className="text-slate-300 text-[11px] mb-1">{exp.meaning}</div>
                  <div className="text-slate-400 italic text-[11px] bg-slate-950/40 p-1.5 rounded">
                    "{exp.exampleInContext}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* High-Value Vocabulary Recommendations */}
        {summary.highValueVocabularyRecommendations && summary.highValueVocabularyRecommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="w-4 h-4" />
              <span>Vocabulary to Adopt Next</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {summary.highValueVocabularyRecommendations.map((vocab, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-3 text-xs"
                >
                  <div className="font-bold text-cyan-200">
                    {vocab.wordOrPhrase}{' '}
                    <span className="text-[11px] font-normal text-slate-400">
                      ({vocab.translation})
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">{vocab.whyItElevates}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        ) : (
          /* TAB 2: OVERALL PROGRESS REPORT CARD & MASTERY COCKPIT */
          <div className="space-y-6 my-4 animate-fadeIn">
            {/* Header Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/30 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
                    Overall Candidate Progress Report Card
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  {allScores.length} Interview(s) Evaluated
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Aggregated performance metrics measured across your current and completed technical interview sessions.
                Track dimensional growth, radar proficiency shifts, and recurring focus areas.
              </p>
            </div>

            {/* Aggregated KPI Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Completed
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-100 font-mono mt-1 block">
                  {allScores.length}
                </span>
                <span className="text-[10px] text-slate-500 block">Mock Interviews</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-teal-500/30 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  All-Time Average
                </span>
                <span className="text-2xl sm:text-3xl font-black text-teal-300 font-mono mt-1 block">
                  {averageAllTimeScore}
                  <span className="text-xs text-slate-500">/100</span>
                </span>
                <span className="text-[10px] text-teal-400/80 block">Mean Score</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Growth Trajectory
                </span>
                <span className={`text-2xl sm:text-3xl font-black font-mono mt-1 block ${
                  scoreTrendPercent >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {scoreTrendPercent >= 0 ? `+${scoreTrendPercent}%` : `${scoreTrendPercent}%`}
                </span>
                <span className="text-[10px] text-slate-500 block">Since First Attempt</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Highest Score
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-1 block">
                  {highestScore}
                  <span className="text-xs text-slate-500">/100</span>
                </span>
                <span className="text-[10px] text-amber-400/80 block">Personal Best</span>
              </div>
            </div>

            {/* Overall Radar Comparison: Active vs Historical vs Benchmark */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Cumulative Multi-Session Radar Benchmark
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Comparing Current vs All-Time</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <RadarChart
                    dimensions={radarDimensions}
                    size={290}
                    secondaryScores={avgDimensions.map((d) => d.score)}
                    secondaryLabel="All-Time Avg"
                  />
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Long-Term Dimension Mastery:
                  </h5>
                  <div className="space-y-2 text-xs">
                    {avgDimensions.map((d) => (
                      <div key={d.key} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{d.label}</span>
                          <span className="font-mono font-bold text-purple-300">{d.score}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.score >= 80 ? 'bg-emerald-400' : d.score >= 70 ? 'bg-purple-400' : 'bg-amber-400'}`}
                            style={{ width: `${d.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Persistent Focus Areas across all sessions */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Key Areas to Focus Across Sessions
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Recurring High-Yield Drills</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/20 text-xs space-y-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🎯</span> Quantitative Metrics & SLAs
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Consistently articulate QPS, latency percentiles (P95/P99), cache hit rates, and database IOPS in technical answers.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/20 text-xs space-y-1">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <span>🎯</span> Architectural Trade-Off Decisions
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Always justify why an architectural alternative was rejected (e.g. eventual consistency vs strong consistency).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-teal-500/20 text-xs space-y-1">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <span>🎯</span> Production Resiliency & Diagnostics
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Step through observability tooling, circuit breaking, fallback degradation, and runbook incident management.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-xs space-y-1">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>🎯</span> Structured Response Cadence
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Begin with the executive summary, present the design blueprint, and finish with verified operational outcomes.
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Sessions Log */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Completed Interview Sessions Log ({savedSessions.length + 1})
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Sorted Chronologically</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {/* Active current session entry */}
                <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold mr-2">
                      CURRENT
                    </span>
                    <span className="font-bold text-slate-100">{scenario?.title || 'Technical Interview'}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({scenario?.learnerRole})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-300">{score}/100</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRatingBadgeStyle(rating)}`}>
                      {rating}
                    </span>
                  </div>
                </div>

                {/* Past saved sessions entries */}
                {savedSessions.map((past) => {
                  const pastScore = past.summary?.overallScore || 75;
                  const pastRating = past.summary?.overallRating || 'Good';
                  return (
                    <div
                      key={past.id}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-200">{past.scenarioTitle}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">
                          {new Date(past.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-300">{pastScore}/100</span>
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {past.cefrLevel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors w-full sm:w-auto justify-center"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export JSON Scorecard</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRestart}
              className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-teal-500/20 transition-all"
            >
              Start New Scenario
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Back to Dialogue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
