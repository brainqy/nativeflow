import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Maximize,
  Volume2,
  Mic,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Radio,
  Lock,
  Sparkles,
  Info,
  Laptop,
} from 'lucide-react';
import { DualAudioMetrics } from '../../types';

interface ScreenShareFullscreenModalProps {
  isScreenSharingActive: boolean;
  displaySurface: 'monitor' | 'window' | 'browser' | 'none';
  screenStream: MediaStream | null;
  isFullscreen: boolean;
  dualAudioMetrics: DualAudioMetrics;
  onStartScreenSharing: () => Promise<MediaStream | null>;
  onRequestFullscreen: () => Promise<void>;
  onSuccess: () => void;
  onBack: () => void;
}

export const ScreenShareFullscreenModal: React.FC<ScreenShareFullscreenModalProps> = ({
  isScreenSharingActive,
  displaySurface,
  screenStream,
  isFullscreen,
  dualAudioMetrics,
  onStartScreenSharing,
  onRequestFullscreen,
  onSuccess,
  onBack,
}) => {
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [isRequestingShare, setIsRequestingShare] = useState<boolean>(false);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch((err) => console.warn('Screen video play error:', err));
    }
  }, [screenStream]);

  const handleShareClick = async () => {
    setIsRequestingShare(true);
    setSharingError(null);
    try {
      await onStartScreenSharing();
    } catch (err: any) {
      setSharingError(
        'Entire screen sharing permission was not granted. Please select "Entire Screen" when prompted.'
      );
    } finally {
      setIsRequestingShare(false);
    }
  };

  const isMonitorShared = isScreenSharingActive && displaySurface === 'monitor';
  const canStartInterview = isScreenSharingActive && isFullscreen;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full text-slate-100 max-h-[92vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                STEP 4 OF 4
              </span>
              <h3 className="font-bold text-base text-slate-100">
                Screen Lockout & Dual-Audio Control
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Enforce full-monitor sharing, fullscreen focus lockout, and dual-channel system audio monitoring.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Verification Checklist Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Entire Monitor Share Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            isMonitorShared
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : isScreenSharingActive
              ? 'bg-amber-950/20 border-amber-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Monitor className={`w-5 h-5 ${isMonitorShared ? 'text-emerald-400' : 'text-teal-400'}`} />
                <span className="font-bold text-xs text-slate-200">Entire Screen Share</span>
              </div>
              {isMonitorShared ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Monitor</span>
                </span>
              ) : isScreenSharingActive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Window Only</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Must capture your whole desktop monitor. Single application windows or tabs will trigger anti-cheat warnings.
            </p>

            {!isScreenSharingActive ? (
              <button
                type="button"
                onClick={handleShareClick}
                disabled={isRequestingShare}
                className="w-full py-2 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isRequestingShare ? 'Sharing Prompt Open...' : 'Share Entire Monitor'}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-700 relative">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-emerald-300">
                    Live Stream
                  </div>
                </div>

                {!isMonitorShared && (
                  <button
                    type="button"
                    onClick={handleShareClick}
                    className="text-[11px] text-amber-300 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Switch to Entire Screen</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen Lockout Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            isFullscreen
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Maximize className={`w-5 h-5 ${isFullscreen ? 'text-emerald-400' : 'text-teal-400'}`} />
                <span className="font-bold text-xs text-slate-200">Fullscreen Focus Lockout</span>
              </div>
              {isFullscreen ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Locked In</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Enforces dedicated window focus. Exiting fullscreen or tabbing away registers an instant security strike.
            </p>

            <button
              type="button"
              onClick={onRequestFullscreen}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                isFullscreen
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>{isFullscreen ? 'Fullscreen Mode Active' : 'Enter Fullscreen Lockout'}</span>
            </button>
          </div>
        </div>

        {sharingError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{sharingError}</span>
          </div>
        )}

        {/* Dual-Channel Audio & System Audio Control Console */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Dual-Channel Audio & Internal System Audio Control
              </span>
            </div>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              Live Acoustic Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Channel 1: Candidate Microphone */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-teal-400" />
                  <span>Channel 1: Microphone Stream</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {dualAudioMetrics.micRms} dB
                </span>
              </div>

              {/* Live VU Meter Bar */}
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, dualAudioMetrics.micRms * 1.5)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Whisper Detector:</span>
                <span className={dualAudioMetrics.whisperDetected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {dualAudioMetrics.whisperDetected ? '⚠️ Low Whisper Detected' : 'Clear / Normal Room'}
                </span>
              </div>
            </div>

            {/* Channel 2: Internal System Audio Control */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Channel 2: Internal System Audio</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {dualAudioMetrics.systemAudioRms} dB
                </span>
              </div>

              {/* Live System Audio Bar */}
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    dualAudioMetrics.systemAudioActive
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, dualAudioMetrics.systemAudioRms * 2.2)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>AI Prompting Audio Guard:</span>
                <span className={dualAudioMetrics.systemAudioActive ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {dualAudioMetrics.systemAudioActive ? '⚠️ Internal Sound Detected' : 'Silent / No Leaks'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Dual-channel acoustic filters actively separate physical candidate speech from internal OS sound cards to catch background ChatGPT Voice, unauthorized coaching bots, or secondary calls.
          </p>
        </div>

        {/* Security Policy Notice */}
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>3-Strike Anti-Cheat Policy:</strong> 1st infraction logs an on-screen warning; 2nd logs an official recruiter caution; 3rd terminates the session with an Integrity Breach report.
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          Back to Calibration
        </button>

        <button
          type="button"
          disabled={!canStartInterview}
          onClick={onSuccess}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>Launch Verified Proctored Interview</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
