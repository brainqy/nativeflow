import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CandidateResumeProfile,
  GovernmentIdVerification,
  GazeCalibrationData,
  ProctoringIncident,
  ProctoringViolationType,
  DualAudioMetrics,
  GazeDirection,
  ProctoringSessionState,
} from '../types';
import { RealTimeEyeTracker } from '../utils/eyeTracker';

export interface UseProctoringOptions {
  onStrikeThresholdReached?: (strikes: number) => void;
}

export function useProctoring(options?: UseProctoringOptions) {
  const [isProctoringActive, setIsProctoringActive] = useState<boolean>(false);
  const [resumeProfile, setResumeProfile] = useState<CandidateResumeProfile | null>(null);
  const [idVerification, setIdVerification] = useState<GovernmentIdVerification | null>(null);
  const [gazeCalibration, setGazeCalibration] = useState<GazeCalibrationData | null>(null);

  // Screen sharing & Fullscreen
  const [isScreenSharingActive, setIsScreenSharingActive] = useState<boolean>(false);
  const [displaySurface, setDisplaySurface] = useState<'monitor' | 'window' | 'browser' | 'none'>('none');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lockoutAlert, setLockoutAlert] = useState<{
    visible: boolean;
    reason: string;
    incidentType: ProctoringViolationType;
  } | null>(null);

  // Security strikes & integrity
  const [strikeCount, setStrikeCount] = useState<number>(0);
  const maxStrikes = 3;
  const [integrityScore, setIntegrityScore] = useState<number>(100);
  const [incidents, setIncidents] = useState<ProctoringIncident[]>([]);

  // Gaze tracking
  const [gazeVector, setGazeVector] = useState<GazeDirection>('CENTER');
  const [gazeOnScreenPercent, setGazeOnScreenPercent] = useState<number>(98);
  const gazeDeviationsRef = useRef<number>(0);
  const totalGazeChecksRef = useRef<number>(0);

  // Streams
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Dual-channel audio metrics
  const [dualAudioMetrics, setDualAudioMetrics] = useState<DualAudioMetrics>({
    micRms: 0,
    micPeak: 0,
    whisperBandEnergy: 0,
    systemAudioRms: 0,
    systemAudioPeak: 0,
    systemAudioActive: false,
    whisperDetected: false,
  });

  // Audio Context & Analysers refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const systemAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastSystemAudioAlertRef = useRef<number>(0);
  const lastWhisperAlertRef = useRef<number>(0);
  const lastGazeAlertRef = useRef<number>(0);
  const eyeTrackerRef = useRef<RealTimeEyeTracker>(new RealTimeEyeTracker());
  const gazeProcessCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Log Incident helper
  const logIncident = useCallback(
    (
      type: ProctoringViolationType,
      title: string,
      description: string,
      severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
      snapshotBase64?: string
    ) => {
      const incident: ProctoringIncident = {
        id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type,
        severity,
        title,
        description,
        snapshotBase64,
      };

      setIncidents((prev) => [incident, ...prev]);

      // Deduct from integrity score
      setIntegrityScore((prev) => {
        const penalty = severity === 'critical' ? 20 : severity === 'high' ? 12 : severity === 'medium' ? 6 : 2;
        return Math.max(0, prev - penalty);
      });

      // Increase strikes if high/critical or lockout
      if (severity === 'high' || severity === 'critical' || type === 'TAB_SWITCH' || type === 'WINDOW_BLUR' || type === 'FULLSCREEN_EXIT') {
        setStrikeCount((prev) => {
          const next = Math.min(maxStrikes, prev + 1);
          if (next >= maxStrikes && options?.onStrikeThresholdReached) {
            options.onStrikeThresholdReached(next);
          }
          return next;
        });
      }

      return incident;
    },
    [maxStrikes, options]
  );

  // 1. Initialize Camera
  const startCamera = useCallback(async () => {
    try {
      if (cameraStream) return cameraStream;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      setCameraStream(stream);
      return stream;
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      return null;
    }
  }, [cameraStream]);

  // 2. Request Entire Monitor Sharing & Fullscreen
  const startScreenSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        } as any,
        audio: true, // Captures system audio if supported by browser/OS
      });

      // Check display surface type
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings() as any;
      const surface = settings.displaySurface || 'monitor';
      setDisplaySurface(surface);
      setIsScreenSharingActive(true);
      setScreenStream(stream);

      // Warning if not entire monitor
      if (surface !== 'monitor') {
        logIncident(
          'MANUAL_FLAG',
          'Partial Screen Shared',
          'Candidate shared a single application window or browser tab instead of entire monitor.',
          'medium'
        );
      } else {
        logIncident(
          'MANUAL_FLAG',
          'Entire Monitor Share Verified',
          'Candidate granted verified entire-screen monitor access.',
          'low'
        );
      }

      // Handle candidate stopping screen share
      videoTrack.onended = () => {
        setIsScreenSharingActive(false);
        setLockoutAlert({
          visible: true,
          reason: 'Screen sharing was stopped! Entire screen sharing is mandatory to maintain interview integrity.',
          incidentType: 'SCREEN_SHARE_STOPPED',
        });
        logIncident(
          'SCREEN_SHARE_STOPPED',
          'Screen Share Terminated',
          'Candidate terminated entire monitor screen sharing during active session.',
          'critical'
        );
      };

      // Set up system audio capture from display stream if present
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        setupSystemAudioMonitoring(stream);
      }

      return stream;
    } catch (err: any) {
      console.error('Screen share request cancelled or failed:', err);
      throw err;
    }
  }, [logIncident]);

  // 3. Setup Dual-Channel Audio Monitoring
  const setupSystemAudioMonitoring = useCallback((displayStream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const audioTrack = displayStream.getAudioTracks()[0];
      if (audioTrack) {
        const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        systemAnalyserRef.current = analyser;
      }
    } catch (err) {
      console.warn('Could not setup system audio monitoring:', err);
    }
  }, []);

  const setupMicrophoneMonitoring = useCallback((micStream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createMediaStreamSource(micStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      micAnalyserRef.current = analyser;
    } catch (err) {
      console.warn('Could not setup mic monitoring:', err);
    }
  }, []);

  // Audio Telemetry & Anomaly Loop
  useEffect(() => {
    if (!isProctoringActive) return;

    const micDataArray = new Uint8Array(256);
    const sysDataArray = new Uint8Array(128);

    const checkAudio = () => {
      let micRms = 0;
      let micPeak = 0;
      let whisperEnergy = 0;
      let sysRms = 0;
      let sysPeak = 0;
      let sysActive = false;
      let whisperDetected = false;

      // Microphone analysis
      if (micAnalyserRef.current) {
        micAnalyserRef.current.getByteFrequencyData(micDataArray);
        let sum = 0;
        let whisperSum = 0;
        // Whisper frequency bins (~300Hz - 2500Hz)
        const whisperStartBin = 4;
        const whisperEndBin = 32;

        for (let i = 0; i < micDataArray.length; i++) {
          const val = micDataArray[i];
          sum += val * val;
          if (val > micPeak) micPeak = val;

          if (i >= whisperStartBin && i <= whisperEndBin) {
            whisperSum += val;
          }
        }
        micRms = Math.sqrt(sum / micDataArray.length);
        whisperEnergy = whisperSum / (whisperEndBin - whisperStartBin);

        // Whisper heuristic: sustained medium whisper energy with low fundamental pitch
        if (whisperEnergy > 65 && micRms < 45 && micRms > 18) {
          whisperDetected = true;
          const now = Date.now();
          if (now - lastWhisperAlertRef.current > 15000) {
            lastWhisperAlertRef.current = now;
            logIncident(
              'WHISPER_DETECTED',
              'Subdued Whisper / Murmur Detected',
              'Acoustic sensor identified sustained low-volume whispering or secondary vocal energy in room.',
              'medium'
            );
          }
        }
      }

      // System Audio analysis
      if (systemAnalyserRef.current) {
        systemAnalyserRef.current.getByteFrequencyData(sysDataArray);
        let sum = 0;
        for (let i = 0; i < sysDataArray.length; i++) {
          const val = sysDataArray[i];
          sum += val * val;
          if (val > sysPeak) sysPeak = val;
        }
        sysRms = Math.sqrt(sum / sysDataArray.length);

        // System audio active if computer is outputting sound (e.g. background AI assistant or call)
        if (sysRms > 15) {
          sysActive = true;
          const now = Date.now();
          if (now - lastSystemAudioAlertRef.current > 20000) {
            lastSystemAudioAlertRef.current = now;
            logIncident(
              'SYSTEM_AUDIO_DETECTED',
              'Internal System Audio Spike',
              'Internal computer sound detected while candidate is expected to speak (possible background voice assistant or secondary call).',
              'high'
            );
          }
        }
      }

      setDualAudioMetrics({
        micRms: Math.round(micRms),
        micPeak: Math.round(micPeak),
        whisperBandEnergy: Math.round(whisperEnergy),
        systemAudioRms: Math.round(sysRms),
        systemAudioPeak: Math.round(sysPeak),
        systemAudioActive: sysActive,
        whisperDetected,
      });

      animFrameIdRef.current = requestAnimationFrame(checkAudio);
    };

    animFrameIdRef.current = requestAnimationFrame(checkAudio);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isProctoringActive, logIncident]);

  // 4. Request Fullscreen
  const requestFullscreenLockout = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Could not enter fullscreen:', err);
    }
  }, []);

  // 5. Enforce Fullscreen Lockout & Tab Switching Detection
  useEffect(() => {
    if (!isProctoringActive) return;

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setLockoutAlert({
          visible: true,
          reason: 'You exited Fullscreen mode! Fullscreen mode is mandatory to prevent unauthorized secondary applications.',
          incidentType: 'FULLSCREEN_EXIT',
        });
        logIncident(
          'FULLSCREEN_EXIT',
          'Fullscreen Lockout Breach',
          'Candidate exited fullscreen view during the active interview session.',
          'high'
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setLockoutAlert({
          visible: true,
          reason: 'Tab Switch / Backgrounding Detected! You switched away from the mock interview tab.',
          incidentType: 'TAB_SWITCH',
        });
        logIncident(
          'TAB_SWITCH',
          'Tab Switching Detected',
          'Candidate navigated away from the proctored interview tab.',
          'critical'
        );
      }
    };

    const handleWindowBlur = () => {
      setLockoutAlert({
        visible: true,
        reason: 'Window Blur / Application Switch Detected! Focus shifted to an external application.',
        incidentType: 'WINDOW_BLUR',
      });
      logIncident(
        'WINDOW_BLUR',
        'External Window Switch',
        'Window focus lost to a secondary monitor or desktop application.',
        'high'
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isProctoringActive, logIncident]);

  // 6. Gaze Tracking Simulation / Video Canvas Tracking
  const evaluateGazeFrame = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!isProctoringActive || !videoElement || videoElement.readyState < 2) return;

      totalGazeChecksRef.current += 1;

      if (!gazeProcessCanvasRef.current) {
        gazeProcessCanvasRef.current = document.createElement('canvas');
        gazeProcessCanvasRef.current.width = 320;
        gazeProcessCanvasRef.current.height = 240;
      }

      const telemetry = eyeTrackerRef.current.processFrame(
        gazeProcessCanvasRef.current,
        videoElement,
        75
      );

      setGazeVector(telemetry.direction);

      if (telemetry.direction !== 'CENTER') {
        gazeDeviationsRef.current += 1;
        const now = Date.now();
        if (now - lastGazeAlertRef.current > 16000) {
          lastGazeAlertRef.current = now;
          logIncident(
            'GAZE_OFF_SCREEN',
            `Gaze Deviation: ${telemetry.direction.replace('_', ' ')}`,
            `Candidate eye gaze diverted away from central monitor towards ${telemetry.direction.toLowerCase().replace('_', ' ')} (Horizontal ΔX: ${telemetry.pupilDeflection.dx}, Vertical ΔY: ${telemetry.pupilDeflection.dy}).`,
            'medium'
          );
        }
      }

      const onScreenRate = Math.round(
        ((totalGazeChecksRef.current - gazeDeviationsRef.current) / Math.max(1, totalGazeChecksRef.current)) * 100
      );
      setGazeOnScreenPercent(Math.max(50, Math.min(100, onScreenRate)));
    },
    [isProctoringActive, logIncident]
  );

  // Close lockout modal
  const resolveLockoutAlert = useCallback(async () => {
    setLockoutAlert(null);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Could not restore fullscreen:', e);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cameraStream, screenStream]);

  const getProctoringSummary = useCallback(() => {
    return {
      integrityScore,
      strikeCount,
      maxStrikes,
      gazeOnScreenPercent,
      resumeProfile,
      idVerification,
      gazeCalibration,
      incidents,
    };
  }, [
    integrityScore,
    strikeCount,
    maxStrikes,
    gazeOnScreenPercent,
    resumeProfile,
    idVerification,
    gazeCalibration,
    incidents,
  ]);

  return {
    isProctoringActive,
    setIsProctoringActive,
    resumeProfile,
    setResumeProfile,
    idVerification,
    setIdVerification,
    gazeCalibration,
    setGazeCalibration,
    isScreenSharingActive,
    displaySurface,
    isFullscreen,
    strikeCount,
    maxStrikes,
    integrityScore,
    incidents,
    gazeVector,
    gazeOnScreenPercent,
    dualAudioMetrics,
    lockoutAlert,
    resolveLockoutAlert,
    resolveLockout: resolveLockoutAlert,
    isFullscreenLockoutActive: Boolean(lockoutAlert?.visible),
    lockoutReason: lockoutAlert?.reason || '',
    lockoutIncidentType: lockoutAlert?.incidentType || 'FULLSCREEN_EXIT',
    startCamera,
    startCameraStream: startCamera,
    cameraStream,
    startScreenSharing,
    screenStream,
    setupMicrophoneMonitoring,
    requestFullscreenLockout,
    requestFullscreen: requestFullscreenLockout,
    evaluateGazeFrame,
    logIncident,
    getProctoringSummary,
  };
}
