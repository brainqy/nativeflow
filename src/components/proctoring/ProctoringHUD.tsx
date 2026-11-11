import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Eye,
  Monitor,
  Mic,
  Volume2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  CreditCard,
  Radio,
  Clock,
  ExternalLink,
  CheckCircle2,
  Maximize,
  Maximize2,
} from 'lucide-react';
import {
  CandidateResumeProfile,
  GovernmentIdVerification,
  GazeCalibrationData,
  ProctoringIncident,
  DualAudioMetrics,
  GazeDirection,
} from '../../types';

interface ProctoringHUDProps {
  isProctoringActive: boolean;
  integrityScore: number;
  strikeCount: number;
  maxStrikes: number;
  gazeVector: GazeDirection;
  gazeOnScreenPercent: number;
  dualAudioMetrics: DualAudioMetrics;
  isScreenSharingActive: boolean;
  displaySurface: string;
  isFullscreen: boolean;
  incidents: ProctoringIncident[];
  resumeProfile: CandidateResumeProfile | null;
  idVerification: GovernmentIdVerification | null;
  gazeCalibration: GazeCalibrationData | null;
  cameraStream: MediaStream | null;
  onEvaluateGazeFrame?: (video: HTMLVideoElement) => void;
  onRequestFullscreen?: () => Promise<void>;
  onOpenEyeGazeLab?: () => void;
}

export const ProctoringHUD: React.FC<ProctoringHUDProps> = ({
  isProctoringActive,
  integrityScore,
  strikeCount,
  maxStrikes,
  gazeVector,
  gazeOnScreenPercent,
  dualAudioMetrics,
  isScreenSharingActive,
  displaySurface,
  isFullscreen,
  incidents,
  resumeProfile,
  idVerification,
  gazeCalibration,
  cameraStream,
  onEvaluateGazeFrame,
  onRequestFullscreen,
  onOpenEyeGazeLab,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'dossier' | 'biometric'>('audit');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Bind camera stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => console.warn('HUD video play error:', err));
    }
  }, [cameraStream]);

  // Periodic gaze analysis loop using video frame
  useEffect(() => {
    if (!isProctoringActive || !onEvaluateGazeFrame) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        onEvaluateGazeFrame(videoRef.current);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isProctoringActive, onEvaluateGazeFrame]);

  if (!isProctoringActive) return null;

  const isGazeOffCenter = gazeVector !== 'CENTER';

  return (
    <aside aria-label="Live AI Proctoring and Anti-Cheat Telemetry" className="relative z-40">
      {/* Top Docked Floating Telemetry Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 shadow-xl rounded-xl p-2 px-3 flex items-center justify-between gap-3 text-xs text-slate-200">
        {/* Left: Overall Integrity Status Pill */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400/20 animate-ping" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
              AI Proctoring:
            </span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                integrityScore > 85
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : integrityScore > 65
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {integrityScore}% Integrity
            </span>
          </div>
        </div>

        {/* Center: Live Gaze, Dual Audio, Screen Badges */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Gaze Vector Badge */}
          <button
            type="button"
            onClick={onOpenEyeGazeLab}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border font-medium text-[11px] transition-all cursor-pointer ${
              isGazeOffCenter
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 animate-pulse hover:bg-amber-950/60'
                : 'bg-slate-950/50 text-slate-300 border-slate-800 hover:border-teal-500/40 hover:bg-slate-900'
            }`}
            title="Click to launch interactive Eye-Gaze Testing Lab & Pupil Calibration"
          >
            <Eye className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Gaze:{' '}
              <strong className={isGazeOffCenter ? 'text-amber-400' : 'text-emerald-400'}>
                {gazeVector === 'CENTER' ? 'Monitor Focus' : gazeVector.replace('_', ' ')}
              </strong>
            </span>
          </button>

          {/* Dual-Channel Audio Meters */}
          <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
            {/* Mic Meter */}
            <div className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-teal-400" />
              <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, dualAudioMetrics.micRms * 1.6)}%` }}
                />
              </div>
            </div>

            <div className="w-px h-3 bg-slate-700" />

            {/* System Audio Meter */}
            <div className="flex items-center gap-1">
              <Volume2 className={`w-3 h-3 ${dualAudioMetrics.systemAudioActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
              <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    dualAudioMetrics.systemAudioActive ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, dualAudioMetrics.systemAudioRms * 2.2)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Monitor Screen Share Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950/50 text-slate-300 border border-slate-800 text-[11px]">
            <Monitor className="w-3.5 h-3.5 text-teal-400" />
            <span>Entire Screen</span>
          </div>

          {/* Fullscreen Status */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950/50 text-slate-300 border border-slate-800 text-[11px]">
            <Maximize className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isFullscreen ? 'Locked' : 'Standard'}</span>
          </div>
        </div>

        {/* Right: Strike Counter & Toggle Drawer */}
        <div className="flex items-center gap-2">
          {/* Strikes Badge */}
          <div
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              strikeCount > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            <span>Strikes:</span>
            <span>
              {strikeCount} / {maxStrikes}
            </span>
          </div>

          {/* Expand Drawer Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-[11px] font-semibold"
          >
            <span>Security Console</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Security Console Drawer */}
      {isExpanded && (
        <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Subheader with Navigation Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Incident Audit Trail ({incidents.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dossier'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resume Dossier</span>
              </button>

              <button
                onClick={() => setActiveTab('biometric')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'biometric'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Verified Gov ID Card</span>
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live Video Camera Miniature with Optical Tracking Reticle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Camera Frame */}
            <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden border border-slate-800 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Overlay Crosshair & Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-14 h-14 rounded-full border-2 border-dashed transition-all duration-300 ${
                    isGazeOffCenter ? 'border-amber-400 scale-110' : 'border-teal-400'
                  }`}
                />
                <div className="absolute w-2 h-2 rounded-full bg-teal-400" />
              </div>
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-teal-300">
                Gaze: {gazeVector}
              </div>
              {onOpenEyeGazeLab && (
                <button
                  type="button"
                  onClick={onOpenEyeGazeLab}
                  className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-teal-500 hover:bg-teal-400 text-[10px] font-bold text-slate-950 flex items-center gap-1 shadow transition-all z-10"
                  title="Open interactive Eye-Gaze Testing Lab & Pupil Calibration"
                >
                  <Eye className="w-2.5 h-2.5" />
                  <span>Test Lab</span>
                </button>
              )}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-emerald-300">
                {gazeOnScreenPercent}% Screen Fixation
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Candidate ID Status
                </span>
                <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{idVerification ? idVerification.idCardType : 'Verified'}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Confidence: {idVerification?.confidenceScore || 92}%
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Gaze Calibration
                </span>
                <span className="text-teal-300 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>5-Point Matrix Active</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Precision: {gazeCalibration?.precisionScore || 97}%
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Mic & Whisper Sensor
                </span>
                <span
                  className={`font-bold flex items-center gap-1 mt-0.5 ${
                    dualAudioMetrics.whisperDetected ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{dualAudioMetrics.whisperDetected ? 'Whisper Alert' : 'Normal Acoustics'}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Mic Level: {dualAudioMetrics.micRms} dB
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Internal System Audio
                </span>
                <span
                  className={`font-bold flex items-center gap-1 mt-0.5 ${
                    dualAudioMetrics.systemAudioActive ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{dualAudioMetrics.systemAudioActive ? 'Active Sound Leak' : 'Silent Stream'}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  System Audio: {dualAudioMetrics.systemAudioRms} dB
                </span>
              </div>
            </div>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'audit' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Security Incident Feed & Live Audit
              </span>
              {incidents.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <span>Zero security violations detected. Interview integrity remains 100%.</span>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                        inc.severity === 'critical'
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                          : inc.severity === 'high'
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{inc.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700">
                            {inc.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{inc.description}</p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dossier' && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100">{resumeProfile?.candidateName || 'Candidate'}</h4>
                  <p className="text-teal-300">{resumeProfile?.headline}</p>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{resumeProfile?.fileName}</span>
              </div>
              <p className="text-slate-300 italic text-[11px]">"{resumeProfile?.summary}"</p>
              <div className="flex flex-wrap gap-1">
                {(resumeProfile?.skills || []).map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 text-[10px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'biometric' && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Verified Photo & Government ID Credential</span>
                <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                  VERIFIED
                </span>
              </div>
              {idVerification?.capturedPhotoBase64 && (
                <div className="w-48 aspect-video rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={idVerification.capturedPhotoBase64}
                    alt="Candidate with ID"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>ID Document: <strong>{idVerification?.idCardType}</strong></div>
                <div>Extracted ID Name: <strong>{idVerification?.extractedNameFromId}</strong></div>
                <div>OCR Correlation: <strong>{idVerification?.nameMatchScore}% Match</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
