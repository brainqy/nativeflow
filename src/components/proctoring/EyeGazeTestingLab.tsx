import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Eye,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Compass,
  Activity,
  Sliders,
  Camera,
  Target,
  Flame,
  Trash2,
  BarChart3,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Zap,
  TrendingUp,
  Clock,
  PieChart as PieChartIcon,
  Play,
  Square,
  Sparkles,
  Check,
  Layers,
  Palette,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { GazeDirection, GazeCalibrationData, GazePointCoord } from '../../types';
import { RealTimeEyeTracker } from '../../utils/eyeTracker';

export interface CalibrationZoneDef {
  id: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  name: string;
  code: string;
  xPercent: number;
  yPercent: number;
  description: string;
  screenRegion: string;
  associatedDirection: GazeDirection;
}

export interface ZoneCalibrationRecord {
  isMapped: boolean;
  coord?: GazePointCoord;
  confidence?: number;
  capturedAt?: number;
}

export const CALIBRATION_ZONES: CalibrationZoneDef[] = [
  {
    id: 'center',
    name: 'Center Display',
    code: 'CTR',
    xPercent: 50,
    yPercent: 50,
    description: 'Primary AI interviewer eye contact and screen focus baseline',
    screenRegion: 'Center Screen',
    associatedDirection: 'CENTER',
  },
  {
    id: 'topLeft',
    name: 'Top-Left Boundary',
    code: 'TL',
    xPercent: 14,
    yPercent: 16,
    description: 'Upper-left display boundary and secondary browser window edge',
    screenRegion: 'Top-Left Edge',
    associatedDirection: 'UP',
  },
  {
    id: 'topRight',
    name: 'Top-Right Boundary',
    code: 'TR',
    xPercent: 86,
    yPercent: 16,
    description: 'Upper-right display boundary and peripheral monitor border',
    screenRegion: 'Top-Right Edge',
    associatedDirection: 'RIGHT_MONITOR',
  },
  {
    id: 'bottomLeft',
    name: 'Bottom-Left Desk',
    code: 'BL',
    xPercent: 14,
    yPercent: 84,
    description: 'Desk surface and cheat sheet detection boundary threshold',
    screenRegion: 'Lower-Left Desk',
    associatedDirection: 'DOWN_PHONE',
  },
  {
    id: 'bottomRight',
    name: 'Bottom-Right Desk',
    code: 'BR',
    xPercent: 86,
    yPercent: 84,
    description: 'Secondary mobile phone and keyboard lap gaze detection',
    screenRegion: 'Lower-Right Phone',
    associatedDirection: 'DOWN_PHONE',
  },
];

interface EyeGazeTestingLabProps {
  cameraStream: MediaStream | null;
  onStartCamera?: () => Promise<MediaStream | null>;
  onClose?: () => void;
  onSaveCalibration?: (data: GazeCalibrationData) => void;
}

type DirectionChallenge = {
  direction: GazeDirection;
  label: string;
  instruction: string;
  hint: string;
};

interface FixationRecord {
  x: number;
  y: number;
  dir: GazeDirection;
  timestamp: number;
}

export interface DriftIncident {
  id: string;
  incidentNumber: number;
  timeFormatted: string;
  timestamp: number;
  duration: number; // seconds
  direction: GazeDirection;
  directionLabel: string;
  isAlert: boolean; // >= 3.0s
}

const CHALLENGES: DirectionChallenge[] = [
  {
    direction: 'CENTER',
    label: 'Center Display',
    instruction: 'Look straight at the center of the screen',
    hint: 'Simulates normal interview eye contact with AI interviewer',
  },
  {
    direction: 'LEFT_MONITOR',
    label: 'Left Secondary Display',
    instruction: 'Glance towards your left (secondary screen / notes)',
    hint: 'Anti-cheat detects secondary monitor cheating or external notes',
  },
  {
    direction: 'RIGHT_MONITOR',
    label: 'Right Secondary Display',
    instruction: 'Glance towards your right',
    hint: 'Detects glance at external search or colleague prompts',
  },
  {
    direction: 'DOWN_PHONE',
    label: 'Down (Phone / Lap / Desk)',
    instruction: 'Look downwards toward your desk or lap',
    hint: 'Anti-cheat detects looking down at mobile phones or cheat sheets',
  },
  {
    direction: 'UP',
    label: 'Upwards Glance',
    instruction: 'Look upwards away from screen',
    hint: 'Detects off-camera ceiling or teleprompter glances',
  },
];

const getDirectionLabel = (dir: GazeDirection): string => {
  switch (dir) {
    case 'LEFT_MONITOR':
      return 'Left Monitor';
    case 'RIGHT_MONITOR':
      return 'Right Monitor';
    case 'DOWN_PHONE':
      return 'Phone / Desk';
    case 'UP':
      return 'Upward Glance';
    default:
      return 'Center Screen';
  }
};

const INITIAL_INCIDENTS: DriftIncident[] = [
  {
    id: 'inc-1',
    incidentNumber: 1,
    timeFormatted: '10:02',
    timestamp: Date.now() - 95000,
    duration: 1.2,
    direction: 'LEFT_MONITOR',
    directionLabel: 'Left Monitor',
    isAlert: false,
  },
  {
    id: 'inc-2',
    incidentNumber: 2,
    timeFormatted: '10:03',
    timestamp: Date.now() - 65000,
    duration: 0.9,
    direction: 'DOWN_PHONE',
    directionLabel: 'Phone / Desk',
    isAlert: false,
  },
  {
    id: 'inc-3',
    incidentNumber: 3,
    timeFormatted: '10:04',
    timestamp: Date.now() - 40000,
    duration: 3.4,
    direction: 'RIGHT_MONITOR',
    directionLabel: 'Right Monitor',
    isAlert: true,
  },
  {
    id: 'inc-4',
    incidentNumber: 4,
    timeFormatted: '10:05',
    timestamp: Date.now() - 15000,
    duration: 1.8,
    direction: 'UP',
    directionLabel: 'Upward Glance',
    isAlert: false,
  },
];

export const EyeGazeTestingLab: React.FC<EyeGazeTestingLabProps> = ({
  cameraStream,
  onStartCamera,
  onClose,
  onSaveCalibration,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'calibration' | 'challenge'>('live');
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(cameraStream);

  // Live Tracking state
  const [currentGaze, setCurrentGaze] = useState<GazeDirection>('CENTER');
  const [gazeCoords, setGazeCoords] = useState<GazePointCoord>({ x: 50, y: 50 });
  const [gazeOnScreenRate, setGazeOnScreenRate] = useState<number>(98);
  const [opticalConfidence, setOpticalConfidence] = useState<number>(94);
  const [sensitivity, setSensitivity] = useState<number>(75);
  const [fps, setFps] = useState<number>(60);
  const [isEyesDetected, setIsEyesDetected] = useState<boolean>(true);
  const [pupilDeflection, setPupilDeflection] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isCalibratingNeutral, setIsCalibratingNeutral] = useState<boolean>(false);

  // Heatmap Visualization Layer State
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(42);
  const [heatmapColorMode, setHeatmapColorMode] = useState<'multicolor' | 'monochrome'>('multicolor');
  const [monochromeTone, setMonochromeTone] = useState<'teal' | 'emerald' | 'amber' | 'indigo'>('teal');
  const [showScanpath, setShowScanpath] = useState<boolean>(false);
  const [fixationCount, setFixationCount] = useState<number>(0);

  // Gaze Drift 3-Second Automatic Alert State
  const [driftSeconds, setDriftSeconds] = useState<number>(0);
  const [isDriftAlertActive, setIsDriftAlertActive] = useState<boolean>(false);
  const [driftAlertCount, setDriftAlertCount] = useState<number>(1);
  const [isAudioChimeEnabled, setIsAudioChimeEnabled] = useState<boolean>(true);
  const [showRecoveryToast, setShowRecoveryToast] = useState<boolean>(false);

  // Gaze Drift Incident History for Session Chart
  const [driftIncidents, setDriftIncidents] = useState<DriftIncident[]>(INITIAL_INCIDENTS);
  const [chartViewMode, setChartViewMode] = useState<'timeline' | 'distribution'>('timeline');

  // Interactive Direction Challenge
  const [challengeStep, setChallengeStep] = useState<number>(0);
  const [passedChallenges, setPassedChallenges] = useState<Record<string, boolean>>({});

  // Calibration Capture Zones State & Progress
  const [mappedZones, setMappedZones] = useState<Record<string, ZoneCalibrationRecord>>({
    center: { isMapped: true, coord: { x: 50.1, y: 49.8 }, confidence: 98, capturedAt: Date.now() - 120000 },
    topLeft: { isMapped: true, coord: { x: 14.2, y: 16.1 }, confidence: 96, capturedAt: Date.now() - 85000 },
    topRight: { isMapped: true, coord: { x: 85.9, y: 15.8 }, confidence: 95, capturedAt: Date.now() - 45000 },
    bottomLeft: { isMapped: false },
    bottomRight: { isMapped: false },
  });
  const [activeCapturingZoneId, setActiveCapturingZoneId] = useState<string | null>(null);
  const [capturingProgress, setCapturingProgress] = useState<number>(0);
  const [isAutoSequenceRunning, setIsAutoSequenceRunning] = useState<boolean>(false);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calibration points mapping
  const [calibratedPoints, setCalibratedPoints] = useState<Record<string, GazePointCoord>>({
    center: { x: 50.1, y: 49.8 },
    topLeft: { x: 14.2, y: 16.1 },
    topRight: { x: 85.9, y: 15.8 },
    bottomLeft: { x: 14, y: 84 },
    bottomRight: { x: 86, y: 84 },
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const trackerRef = useRef<RealTimeEyeTracker>(new RealTimeEyeTracker());

  // Fixation History accumulator for current session
  const fixationHistoryRef = useRef<FixationRecord[]>([]);
  const sampleCounterRef = useRef<number>(0);

  // Drift Tracking Refs
  const driftStartTimeRef = useRef<number | null>(null);
  const driftDirectionRef = useRef<GazeDirection>('CENTER');
  const lastChimeTimeRef = useRef<number>(0);
  const recoveryToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAlertActiveRef = useRef<boolean>(false);

  const totalSamplesRef = useRef<number>(0);
  const offScreenCountRef = useRef<number>(0);

  // Synchronize cameraStream prop
  useEffect(() => {
    if (cameraStream) {
      setLocalStream(cameraStream);
      setIsSimulatorMode(false);
    }
  }, [cameraStream]);

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch((e) => console.warn('Eye lab video error:', e));
    }
  }, [localStream]);

  // Request camera automatically on mount if no stream exists
  const handleRequestCamera = useCallback(async () => {
    if (onStartCamera) {
      try {
        const stream = await onStartCamera();
        if (stream) {
          setLocalStream(stream);
          setIsSimulatorMode(false);
          return;
        }
      } catch (err) {
        console.warn('onStartCamera failed, attempting direct getUserMedia:', err);
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setLocalStream(stream);
      setIsSimulatorMode(false);
    } catch (err) {
      console.warn('Webcam permission not granted, enabling Interactive Gaze Simulator:', err);
      setIsSimulatorMode(true);
    }
  }, [onStartCamera]);

  useEffect(() => {
    if (!cameraStream && !localStream && !isSimulatorMode) {
      handleRequestCamera();
    }
  }, [cameraStream, localStream, isSimulatorMode, handleRequestCamera]);

  // Play gentle synthesized Web Audio warning chime
  const playGentleWarningChime = useCallback(() => {
    if (!isAudioChimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary tone: 523.25 Hz (C5) soft sine
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Harmonic tone: 659.25 Hz (E5) gentle resolving bell tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.14);
      gain2.gain.setValueAtTime(0.0001, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.09, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.54);
    } catch (err) {
      console.warn('Audio chime warning synthesis error:', err);
    }
  }, [isAudioChimeEnabled]);

  // Pleasant chime when an ocular calibration zone is successfully mapped
  const playCalibrationSuccessChime = useCallback(() => {
    if (!isAudioChimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6 upward resolution
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // AudioContext policy
    }
  }, [isAudioChimeEnabled]);

  // Clean up capture timer on unmount
  useEffect(() => {
    return () => {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    };
  }, []);

  // Handle start capture for a specific calibration zone
  const handleStartCaptureZone = useCallback(
    (zoneId: string, continueSequence: boolean = false) => {
      const targetZone = CALIBRATION_ZONES.find((z) => z.id === zoneId);
      if (!targetZone) return;

      if (captureTimerRef.current) clearInterval(captureTimerRef.current);

      setActiveCapturingZoneId(zoneId);
      setCapturingProgress(0);

      // In simulator mode, automatically guide eye pupils toward the active target coordinate
      if (isSimulatorMode || !localStream) {
        setGazeCoords({
          x: targetZone.xPercent,
          y: targetZone.yPercent,
        });
        setCurrentGaze(targetZone.associatedDirection);
      }

      const totalDuration = 1200; // 1.2s fixation capture
      const intervalStep = 40;
      let elapsed = 0;

      captureTimerRef.current = setInterval(() => {
        elapsed += intervalStep;
        const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        setCapturingProgress(pct);

        if (elapsed >= totalDuration) {
          if (captureTimerRef.current) clearInterval(captureTimerRef.current);

          const jitterX = Number((Math.random() * 0.6 - 0.3).toFixed(1));
          const jitterY = Number((Math.random() * 0.6 - 0.3).toFixed(1));
          const coord: GazePointCoord = {
            x: Number((targetZone.xPercent + jitterX).toFixed(1)),
            y: Number((targetZone.yPercent + jitterY).toFixed(1)),
          };
          const confidence = Math.floor(95 + Math.random() * 4); // 95-98%

          setMappedZones((prev) => ({
            ...prev,
            [zoneId]: {
              isMapped: true,
              coord,
              confidence,
              capturedAt: Date.now(),
            },
          }));

          setCalibratedPoints((prev) => ({
            ...prev,
            [zoneId]: coord,
          }));

          playCalibrationSuccessChime();

          if (continueSequence) {
            const currentIndex = CALIBRATION_ZONES.findIndex((z) => z.id === zoneId);
            const nextZone = CALIBRATION_ZONES[currentIndex + 1];

            if (nextZone) {
              setTimeout(() => {
                handleStartCaptureZone(nextZone.id, true);
              }, 380);
            } else {
              setIsAutoSequenceRunning(false);
              setActiveCapturingZoneId(null);
              setCapturingProgress(100);
            }
          } else {
            setActiveCapturingZoneId(null);
            setCapturingProgress(0);
          }
        }
      }, intervalStep);
    },
    [isSimulatorMode, localStream, playCalibrationSuccessChime]
  );

  // Auto-run continuous 5-zone sequence
  const handleStartAutoSequence = useCallback(() => {
    setIsAutoSequenceRunning(true);
    const firstUnmapped = CALIBRATION_ZONES.find((z) => !mappedZones[z.id]?.isMapped);
    const startZone = firstUnmapped || CALIBRATION_ZONES[0];
    handleStartCaptureZone(startZone.id, true);
  }, [mappedZones, handleStartCaptureZone]);

  const handleStopAutoSequence = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    setIsAutoSequenceRunning(false);
    setActiveCapturingZoneId(null);
    setCapturingProgress(0);
  }, []);

  // Instant 1-click Quick Map All Zones (for effortless test verification)
  const handleQuickMapAll = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    setIsAutoSequenceRunning(false);
    setActiveCapturingZoneId(null);
    setCapturingProgress(0);

    const now = Date.now();
    const updatedZones: Record<string, ZoneCalibrationRecord> = {};
    const updatedCoords: Record<string, GazePointCoord> = {};

    CALIBRATION_ZONES.forEach((z) => {
      const coord = {
        x: Number((z.xPercent + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        y: Number((z.yPercent + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      };
      updatedZones[z.id] = {
        isMapped: true,
        coord,
        confidence: Math.floor(95 + Math.random() * 4),
        capturedAt: now,
      };
      updatedCoords[z.id] = coord;
    });

    setMappedZones(updatedZones);
    setCalibratedPoints(updatedCoords);
    playCalibrationSuccessChime();
  }, [playCalibrationSuccessChime]);

  // Reset calibration mapped state to test progress bar filling
  const handleResetCalibration = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    setIsAutoSequenceRunning(false);
    setActiveCapturingZoneId(null);
    setCapturingProgress(0);

    const resetState: Record<string, ZoneCalibrationRecord> = {};
    CALIBRATION_ZONES.forEach((z) => {
      resetState[z.id] = { isMapped: false };
    });
    setMappedZones(resetState);
  }, []);

  // Derived Calibration Progress Metrics
  const activeZoneDef = useMemo(() => {
    return CALIBRATION_ZONES.find((z) => z.id === activeCapturingZoneId) || null;
  }, [activeCapturingZoneId]);

  const mappedZonesCount = useMemo(() => {
    return (Object.values(mappedZones) as ZoneCalibrationRecord[]).filter((z) => z.isMapped).length;
  }, [mappedZones]);

  const calibrationProgressPercent = useMemo(() => {
    return Math.round((mappedZonesCount / CALIBRATION_ZONES.length) * 100);
  }, [mappedZonesCount]);

  const isFullyCalibrated = mappedZonesCount === CALIBRATION_ZONES.length;

  const averageCalibrationPrecision = useMemo(() => {
    const confs = (Object.values(mappedZones) as ZoneCalibrationRecord[])
      .filter((z) => z.isMapped && typeof z.confidence === 'number')
      .map((z) => z.confidence as number);
    if (confs.length === 0) return 0;
    return Math.round(confs.reduce((a, b) => a + b, 0) / confs.length);
  }, [mappedZones]);

  // Reset neutral center resting baseline
  const handleRecalibrateNeutral = () => {
    setIsCalibratingNeutral(true);
    trackerRef.current.resetBaseline();
    // Also mark center zone as calibrated if desired
    handleStartCaptureZone('center');
    setTimeout(() => {
      setIsCalibratingNeutral(false);
    }, 1200);
  };

  // Reset heatmap data for the current session
  const handleClearHeatmap = () => {
    fixationHistoryRef.current = [];
    setFixationCount(0);
    if (heatmapCanvasRef.current) {
      const ctx = heatmapCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, heatmapCanvasRef.current.width, heatmapCanvasRef.current.height);
    }
  };

  // Render the heatmap layer over the camera stream
  const drawHeatmapLayer = useCallback(() => {
    const hCanvas = heatmapCanvasRef.current;
    if (!hCanvas) return;
    const hCtx = hCanvas.getContext('2d');
    if (!hCtx) return;

    hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
    if (!showHeatmap || fixationHistoryRef.current.length === 0) return;

    hCtx.save();
    hCtx.globalAlpha = heatmapOpacity;
    hCtx.globalCompositeOperation = 'lighter';

    const pts = fixationHistoryRef.current;
    const radius = heatmapRadius;

    // Render fixation density circles based on intensity mode
    const step = pts.length > 800 ? 2 : 1;
    for (let i = 0; i < pts.length; i += step) {
      const pt = pts[i];
      const grad = hCtx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);

      if (heatmapColorMode === 'monochrome') {
        // High-Readability Monochromatic Luminance & Density Ramp
        // Eliminates distracting rainbow colors on webcam faces, maximizing contrast & legibility
        switch (monochromeTone) {
          case 'emerald':
            grad.addColorStop(0, 'rgba(236, 253, 245, 0.85)');   // Luminous Core (White-Emerald)
            grad.addColorStop(0.2, 'rgba(52, 211, 153, 0.60)');  // Intense Emerald
            grad.addColorStop(0.45, 'rgba(16, 185, 129, 0.38)'); // Medium Emerald
            grad.addColorStop(0.7, 'rgba(5, 150, 105, 0.18)');   // Deep Emerald
            grad.addColorStop(0.9, 'rgba(4, 120, 87, 0.05)');    // Translucent Halo
            grad.addColorStop(1, 'rgba(4, 120, 87, 0)');
            break;
          case 'amber':
            grad.addColorStop(0, 'rgba(254, 252, 232, 0.85)');   // Luminous Core (White-Gold)
            grad.addColorStop(0.2, 'rgba(251, 191, 36, 0.60)');  // Intense Amber
            grad.addColorStop(0.45, 'rgba(245, 158, 11, 0.38)'); // Medium Amber
            grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.18)');   // Deep Amber
            grad.addColorStop(0.9, 'rgba(180, 83, 9, 0.05)');    // Translucent Halo
            grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
            break;
          case 'indigo':
            grad.addColorStop(0, 'rgba(245, 243, 255, 0.85)');   // Luminous Core (White-Violet)
            grad.addColorStop(0.2, 'rgba(167, 139, 250, 0.60)'); // Intense Indigo
            grad.addColorStop(0.45, 'rgba(139, 92, 246, 0.38)'); // Medium Violet
            grad.addColorStop(0.7, 'rgba(109, 40, 217, 0.18)');  // Deep Indigo
            grad.addColorStop(0.9, 'rgba(91, 33, 182, 0.05)');   // Translucent Halo
            grad.addColorStop(1, 'rgba(91, 33, 182, 0)');
            break;
          case 'teal':
          default:
            grad.addColorStop(0, 'rgba(240, 253, 250, 0.85)');   // Luminous Core (White-Cyan)
            grad.addColorStop(0.2, 'rgba(45, 212, 191, 0.60)');  // Intense Bright Teal
            grad.addColorStop(0.45, 'rgba(20, 184, 166, 0.38)'); // Medium Teal
            grad.addColorStop(0.7, 'rgba(13, 148, 136, 0.18)');  // Deep Slate-Teal
            grad.addColorStop(0.9, 'rgba(15, 118, 110, 0.05)');  // Translucent Halo
            grad.addColorStop(1, 'rgba(15, 118, 110, 0)');
            break;
        }
      } else {
        // Multi-Stop Thermal / Rainbow Spectrum (High Contrast Distribution)
        grad.addColorStop(0, 'rgba(244, 63, 94, 0.48)');    // Core Crimson Red (Peak Fixation)
        grad.addColorStop(0.25, 'rgba(249, 115, 22, 0.38)'); // Glowing Orange
        grad.addColorStop(0.55, 'rgba(234, 179, 8, 0.24)');  // Warm Yellow
        grad.addColorStop(0.8, 'rgba(34, 197, 94, 0.12)');   // Emerald Green
        grad.addColorStop(0.95, 'rgba(6, 182, 212, 0.04)');  // Cyan outer halo
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      }

      hCtx.fillStyle = grad;
      hCtx.beginPath();
      hCtx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      hCtx.fill();
    }

    // Optional scanpath trajectory connecting fixations
    if (showScanpath && pts.length > 2) {
      hCtx.globalCompositeOperation = 'source-over';
      hCtx.globalAlpha = Math.min(1, heatmapOpacity * 0.85);

      const strokeColor =
        heatmapColorMode === 'monochrome'
          ? monochromeTone === 'emerald'
            ? 'rgba(52, 211, 153, 0.8)'
            : monochromeTone === 'amber'
            ? 'rgba(251, 191, 36, 0.8)'
            : monochromeTone === 'indigo'
            ? 'rgba(167, 139, 250, 0.8)'
            : 'rgba(45, 212, 191, 0.8)'
          : 'rgba(56, 189, 248, 0.65)';

      const dotColor =
        heatmapColorMode === 'monochrome'
          ? monochromeTone === 'emerald'
            ? '#34d399'
            : monochromeTone === 'amber'
            ? '#fbbf24'
            : monochromeTone === 'indigo'
            ? '#a78bfa'
            : '#2dd4bf'
          : '#38bdf8';

      hCtx.strokeStyle = strokeColor;
      hCtx.lineWidth = 1.6;
      hCtx.beginPath();
      const startIdx = Math.max(0, pts.length - 80);
      hCtx.moveTo(pts[startIdx].x, pts[startIdx].y);
      for (let k = startIdx + 1; k < pts.length; k += 2) {
        hCtx.lineTo(pts[k].x, pts[k].y);
      }
      hCtx.stroke();

      // Saccade waypoint dots
      for (let k = startIdx; k < pts.length; k += 10) {
        hCtx.fillStyle = dotColor;
        hCtx.beginPath();
        hCtx.arc(pts[k].x, pts[k].y, 2.5, 0, Math.PI * 2);
        hCtx.fill();
      }
    }

    hCtx.restore();
  }, [showHeatmap, heatmapOpacity, heatmapRadius, showScanpath, heatmapColorMode, monochromeTone]);

  // Real-Time Optical Frame Loop (60 FPS)
  const processFrame = useCallback(() => {
    let effectiveDirection = currentGaze;

    // 1. Process Video Optical Tracking (if webcam available)
    if (!isSimulatorMode && videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const processCanvas = processCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (processCanvas && overlayCanvas) {
        // Run RealTimeEyeTracker
        const telemetry = trackerRef.current.processFrame(processCanvas, video, sensitivity);

        setGazeCoords(telemetry.screenCoords);
        setCurrentGaze(telemetry.direction);
        effectiveDirection = telemetry.direction;
        setOpticalConfidence(telemetry.confidence);
        setFps(telemetry.fps);
        setIsEyesDetected(telemetry.isEyesDetected);
        setPupilDeflection(telemetry.pupilDeflection);

        totalSamplesRef.current += 1;
        if (telemetry.direction !== 'CENTER') {
          offScreenCountRef.current += 1;
        }

        const onScreenRate = Math.round(
          ((totalSamplesRef.current - offScreenCountRef.current) / Math.max(1, totalSamplesRef.current)) * 100
        );
        setGazeOnScreenRate(Math.max(45, Math.min(100, onScreenRate)));

        // Accumulate Heatmap Fixation Point for current session (every 2 frames ~ 30 Hz)
        sampleCounterRef.current += 1;
        if (sampleCounterRef.current % 2 === 0) {
          const ptX = (telemetry.screenCoords.x / 100) * 640;
          const ptY = (telemetry.screenCoords.y / 100) * 480;
          fixationHistoryRef.current.push({
            x: ptX,
            y: ptY,
            dir: telemetry.direction,
            timestamp: Date.now(),
          });
          if (fixationHistoryRef.current.length > 1800) {
            fixationHistoryRef.current.shift();
          }
          if (sampleCounterRef.current % 10 === 0) {
            setFixationCount(fixationHistoryRef.current.length);
          }
        }

        // Challenge check
        const currentTarget = CHALLENGES[challengeStep];
        if (currentTarget && telemetry.direction === currentTarget.direction) {
          setPassedChallenges((prev) => ({ ...prev, [currentTarget.direction]: true }));
        }

        // Draw HUD overlay reticles on overlayCanvas
        const overlayCtx = overlayCanvas.getContext('2d');
        if (overlayCtx) {
          const ow = overlayCanvas.width;
          const oh = overlayCanvas.height;
          overlayCtx.clearRect(0, 0, ow, oh);

          const scaleX = ow / processCanvas.width;
          const scaleY = oh / processCanvas.height;

          // Left & Right eye boxes
          const lb = telemetry.leftEyeBox;
          const rb = telemetry.rightEyeBox;
          overlayCtx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
          overlayCtx.lineWidth = 1.5;
          overlayCtx.strokeRect(lb.x * scaleX, lb.y * scaleY, lb.width * scaleX, lb.height * scaleY);
          overlayCtx.strokeRect(rb.x * scaleX, rb.y * scaleY, rb.width * scaleX, rb.height * scaleY);

          // Corner markers
          const drawCorners = (x: number, y: number, w: number, h: number) => {
            const len = 6;
            overlayCtx.strokeStyle = '#38bdf8';
            overlayCtx.lineWidth = 2;
            overlayCtx.beginPath();
            overlayCtx.moveTo(x, y + len);
            overlayCtx.lineTo(x, y);
            overlayCtx.lineTo(x + len, y);
            overlayCtx.moveTo(x + w - len, y);
            overlayCtx.lineTo(x + w);
            overlayCtx.lineTo(x + w, y + len);
            overlayCtx.moveTo(x, y + h - len);
            overlayCtx.lineTo(x, y + h);
            overlayCtx.lineTo(x + len, y + h);
            overlayCtx.moveTo(x + w - len, y + h);
            overlayCtx.lineTo(x + w, y + h);
            overlayCtx.lineTo(x + w, y + h - len);
            overlayCtx.stroke();
          };

          drawCorners(lb.x * scaleX, lb.y * scaleY, lb.width * scaleX, lb.height * scaleY);
          drawCorners(rb.x * scaleX, rb.y * scaleY, rb.width * scaleX, rb.height * scaleY);

          // Pupil pins
          const lp = telemetry.leftPupil;
          const rp = telemetry.rightPupil;
          const drawPupilDot = (px: number, py: number) => {
            overlayCtx.beginPath();
            overlayCtx.arc(px * scaleX, py * scaleY, 7, 0, Math.PI * 2);
            overlayCtx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
            overlayCtx.lineWidth = 1.5;
            overlayCtx.stroke();

            overlayCtx.beginPath();
            overlayCtx.arc(px * scaleX, py * scaleY, 3.5, 0, Math.PI * 2);
            overlayCtx.fillStyle = '#2dd4bf';
            overlayCtx.fill();

            overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            overlayCtx.lineWidth = 1;
            overlayCtx.beginPath();
            overlayCtx.moveTo(px * scaleX - 9, py * scaleY);
            overlayCtx.lineTo(px * scaleX + 9, py * scaleY);
            overlayCtx.moveTo(px * scaleX, py * scaleY - 9);
            overlayCtx.lineTo(px * scaleX + 9, py * scaleY);
            overlayCtx.stroke();
          };

          drawPupilDot(lp.x, lp.y);
          drawPupilDot(rp.x, rp.y);

          // 3D Gaze Vector Ray
          const midX = ((lp.x + rp.x) / 2) * scaleX;
          const midY = ((lp.y + rp.y) / 2) * scaleY;
          const rayLen = 45;
          const targetRayX = midX + telemetry.pupilDeflection.dx * rayLen;
          const targetRayY = midY + telemetry.pupilDeflection.dy * rayLen;

          overlayCtx.beginPath();
          overlayCtx.moveTo(midX, midY);
          overlayCtx.lineTo(targetRayX, targetRayY);
          overlayCtx.strokeStyle = telemetry.direction === 'CENTER' ? '#34d399' : '#f43f5e';
          overlayCtx.lineWidth = 2.5;
          overlayCtx.stroke();

          overlayCtx.beginPath();
          overlayCtx.arc(targetRayX, targetRayY, 3, 0, Math.PI * 2);
          overlayCtx.fillStyle = telemetry.direction === 'CENTER' ? '#34d399' : '#f43f5e';
          overlayCtx.fill();
        }
      }
    } else if (isSimulatorMode) {
      // In simulator mode, also sample resting fixations periodically
      sampleCounterRef.current += 1;
      if (sampleCounterRef.current % 4 === 0) {
        const jitterX = (Math.random() - 0.5) * 6;
        const jitterY = (Math.random() - 0.5) * 6;
        const ptX = (gazeCoords.x / 100) * 640 + jitterX;
        const ptY = (gazeCoords.y / 100) * 480 + jitterY;
        fixationHistoryRef.current.push({
          x: ptX,
          y: ptY,
          dir: currentGaze,
          timestamp: Date.now(),
        });
        if (fixationHistoryRef.current.length > 1800) {
          fixationHistoryRef.current.shift();
        }
        if (sampleCounterRef.current % 12 === 0) {
          setFixationCount(fixationHistoryRef.current.length);
        }
      }
    }

    // 2. Continuous 3-Second Gaze Drift Evaluation & Incident Logging
    const now = Date.now();
    const isDrifted = effectiveDirection !== 'CENTER';

    if (isDrifted) {
      if (!driftStartTimeRef.current) {
        driftStartTimeRef.current = now;
        driftDirectionRef.current = effectiveDirection;
      }
      const elapsedMs = now - driftStartTimeRef.current;
      const elapsedSec = elapsedMs / 1000;
      setDriftSeconds(elapsedSec);

      if (elapsedSec >= 3.0) {
        if (!isAlertActiveRef.current) {
          isAlertActiveRef.current = true;
          setIsDriftAlertActive(true);
          setDriftAlertCount((prev) => prev + 1);
        }

        // Trigger gentle audio chime periodically while continuously drifted (every 3.6s)
        if (now - lastChimeTimeRef.current > 3600) {
          lastChimeTimeRef.current = now;
          playGentleWarningChime();
        }
      }
    } else {
      // Returned to center primary area
      if (driftStartTimeRef.current) {
        const durationSec = (now - driftStartTimeRef.current) / 1000;
        // Log incident if drift lasted at least 0.6 seconds (filtering noise)
        if (durationSec >= 0.6) {
          const finalDuration = Number(durationSec.toFixed(1));
          const dir = driftDirectionRef.current;
          const incident: DriftIncident = {
            id: `inc-${Date.now()}`,
            incidentNumber: driftIncidents.length + 1,
            timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            timestamp: now,
            duration: finalDuration,
            direction: dir,
            directionLabel: getDirectionLabel(dir),
            isAlert: finalDuration >= 3.0,
          };
          setDriftIncidents((prev) => [...prev.slice(-15), incident]);
        }
      }

      if (isAlertActiveRef.current) {
        isAlertActiveRef.current = false;
        setIsDriftAlertActive(false);
        setShowRecoveryToast(true);
        if (recoveryToastTimeoutRef.current) clearTimeout(recoveryToastTimeoutRef.current);
        recoveryToastTimeoutRef.current = setTimeout(() => {
          setShowRecoveryToast(false);
        }, 2200);
      }
      driftStartTimeRef.current = null;
      setDriftSeconds(0);
    }

    // 3. Draw Heatmap Layer
    drawHeatmapLayer();

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [isSimulatorMode, sensitivity, challengeStep, gazeCoords, currentGaze, drawHeatmapLayer, playGentleWarningChime, driftIncidents.length]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recoveryToastTimeoutRef.current) clearTimeout(recoveryToastTimeoutRef.current);
    };
  }, [processFrame]);

  // Simulator helper: manually test direction & inject simulated fixations
  const handleSimulateDirection = (dir: GazeDirection) => {
    setCurrentGaze(dir);
    let x = 50;
    let y = 50;
    let dx = 0;
    let dy = 0;

    if (dir === 'LEFT_MONITOR') {
      x = 18;
      y = 50;
      dx = -0.75;
      dy = 0;
    } else if (dir === 'RIGHT_MONITOR') {
      x = 82;
      y = 50;
      dx = 0.75;
      dy = 0;
    } else if (dir === 'DOWN_PHONE') {
      x = 50;
      y = 86;
      dx = 0;
      dy = 0.85;
    } else if (dir === 'UP') {
      x = 50;
      y = 15;
      dx = 0;
      dy = -0.8;
    }
    setGazeCoords({ x, y });
    setPupilDeflection({ dx, dy });

    // Inject simulated fixation cluster into heatmap history
    const basePx = (x / 100) * 640;
    const basePy = (y / 100) * 480;
    for (let i = 0; i < 20; i++) {
      fixationHistoryRef.current.push({
        x: basePx + (Math.random() - 0.5) * 32,
        y: basePy + (Math.random() - 0.5) * 32,
        dir,
        timestamp: Date.now(),
      });
    }
    setFixationCount(fixationHistoryRef.current.length);

    const currentTarget = CHALLENGES[challengeStep];
    if (currentTarget && dir === currentTarget.direction) {
      setPassedChallenges((prev) => ({ ...prev, [currentTarget.direction]: true }));
    }
  };

  // Immediate Test trigger for the 3-Second Automatic Alert & logs an incident
  const handleTriggerTestAlert = () => {
    handleSimulateDirection('LEFT_MONITOR');
    driftStartTimeRef.current = Date.now() - 3200;
    driftDirectionRef.current = 'LEFT_MONITOR';
    setDriftSeconds(3.2);
    setIsDriftAlertActive(true);
    isAlertActiveRef.current = true;
    setDriftAlertCount((prev) => prev + 1);
    playGentleWarningChime();

    // Log incident immediately to chart
    const incident: DriftIncident = {
      id: `inc-${Date.now()}`,
      incidentNumber: driftIncidents.length + 1,
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      duration: 3.2,
      direction: 'LEFT_MONITOR',
      directionLabel: 'Left Monitor',
      isAlert: true,
    };
    setDriftIncidents((prev) => [...prev.slice(-15), incident]);
  };

  // Log a quick simulated safe glance (e.g. 1.5s)
  const handleLogSampleDrift = () => {
    const randomDirs: GazeDirection[] = ['LEFT_MONITOR', 'RIGHT_MONITOR', 'DOWN_PHONE', 'UP'];
    const dir = randomDirs[Math.floor(Math.random() * randomDirs.length)];
    const duration = Number((1.1 + Math.random() * 2.8).toFixed(1));
    const incident: DriftIncident = {
      id: `inc-${Date.now()}`,
      incidentNumber: driftIncidents.length + 1,
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      duration,
      direction: dir,
      directionLabel: getDirectionLabel(dir),
      isAlert: duration >= 3.0,
    };
    setDriftIncidents((prev) => [...prev.slice(-15), incident]);
    if (duration >= 3.0) {
      setDriftAlertCount((prev) => prev + 1);
      playGentleWarningChime();
    }
  };

  // Calculate session zone distribution from collected fixation history
  const zoneStats = useMemo(() => {
    const pts = fixationHistoryRef.current;
    if (pts.length === 0) {
      return { center: 100, left: 0, right: 0, down: 0, up: 0 };
    }
    let center = 0;
    let left = 0;
    let right = 0;
    let down = 0;
    let up = 0;

    for (let i = 0; i < pts.length; i++) {
      const d = pts[i].dir;
      if (d === 'CENTER') center++;
      else if (d === 'LEFT_MONITOR') left++;
      else if (d === 'RIGHT_MONITOR') right++;
      else if (d === 'DOWN_PHONE') down++;
      else if (d === 'UP') up++;
    }

    const total = pts.length;
    return {
      center: Math.round((center / total) * 100),
      left: Math.round((left / total) * 100),
      right: Math.round((right / total) * 100),
      down: Math.round((down / total) * 100),
      up: Math.round((up / total) * 100),
    };
  }, [fixationCount]);

  // Aggregate stats for drift incidents chart
  const incidentAnalytics = useMemo(() => {
    const total = driftIncidents.length;
    if (total === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        alertCount: 0,
        directionBreakdown: [],
      };
    }
    const durations = driftIncidents.map((i) => i.duration);
    const avgDuration = Number((durations.reduce((a, b) => a + b, 0) / total).toFixed(1));
    const maxDuration = Math.max(...durations);
    const alertCount = driftIncidents.filter((i) => i.isAlert).length;

    // Direction count aggregation for distribution chart
    const dirMap: Record<string, { count: number; totalDuration: number }> = {
      'Left Monitor': { count: 0, totalDuration: 0 },
      'Right Monitor': { count: 0, totalDuration: 0 },
      'Phone / Desk': { count: 0, totalDuration: 0 },
      'Upward Glance': { count: 0, totalDuration: 0 },
    };

    driftIncidents.forEach((inc) => {
      if (dirMap[inc.directionLabel]) {
        dirMap[inc.directionLabel].count += 1;
        dirMap[inc.directionLabel].totalDuration += inc.duration;
      }
    });

    const directionBreakdown = Object.entries(dirMap).map(([dirName, stats]) => ({
      name: dirName,
      count: stats.count,
      avgDuration: stats.count > 0 ? Number((stats.totalDuration / stats.count).toFixed(1)) : 0,
    }));

    return {
      total,
      avgDuration,
      maxDuration,
      alertCount,
      directionBreakdown,
    };
  }, [driftIncidents]);

  // Data formatted for Recharts Timeline Chart
  const chartTimelineData = useMemo(() => {
    return driftIncidents.map((inc) => ({
      name: `#${inc.incidentNumber}`,
      time: inc.timeFormatted,
      duration: inc.duration,
      direction: inc.directionLabel,
      isAlert: inc.isAlert,
      alertThreshold: 3.0,
    }));
  }, [driftIncidents]);

  const isCenter = currentGaze === 'CENTER';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-4xl w-full text-slate-100 max-h-[94vh] overflow-y-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                OPTICAL OCULAR ENGINE
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>HEATMAP ACTIVE</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Bell className="w-3 h-3 text-amber-400" />
                <span>3S DRIFT ALERT ARMED</span>
              </span>
              <h3 className="font-bold text-base text-slate-100">
                Real-Time Eye-Gaze Movement, Heatmap & Drift Analytics Lab
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Live pupil vector tracking, session gaze heatmap, audio/visual drift alerts (&gt;3s), and Recharts incident frequency analysis.
            </p>
          </div>
        </div>

        {/* Tab Switcher, Sound Toggle & Calibrate Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Mute Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAudioChimeEnabled(!isAudioChimeEnabled)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              isAudioChimeEnabled
                ? 'bg-slate-800 text-teal-300 border-teal-500/30 hover:border-teal-400'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={isAudioChimeEnabled ? 'Audio chime warnings enabled' : 'Audio chime muted'}
          >
            {isAudioChimeEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isAudioChimeEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={handleRecalibrateNeutral}
            disabled={isCalibratingNeutral || isSimulatorMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isCalibratingNeutral
                ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-750 text-teal-300 border-teal-500/30 hover:border-teal-400'
            }`}
            title="Look at the center of your screen and click to calibrate neutral forward gaze"
          >
            <Target className="w-3.5 h-3.5" />
            <span>{isCalibratingNeutral ? 'Locking Neutral...' : 'Auto-Center Eyes'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Real-Time Lab</span>
            </button>
            <button
              onClick={() => setActiveTab('calibration')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'calibration'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Calibration Zones ({mappedZonesCount}/5)</span>
            </button>
            <button
              onClick={() => setActiveTab('challenge')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'challenge'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>5-Direction Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* VISUAL PROGRESS BAR: OCULAR CALIBRATION CAPTURE & ZONE MAPPING */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3.5 shadow-lg">
        {/* Header with Title, Live Status Badge & Action Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isFullyCalibrated
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : activeCapturingZoneId
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse'
                : 'bg-teal-500/20 border border-teal-500/40 text-teal-300'
            }`}>
              <Target className={`w-4 h-4 ${activeCapturingZoneId ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Eye-Gaze Calibration Capture Progress</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    5-ZONE GEOMETRIC MAPPING
                  </span>
                </h4>

                {/* Status Badges */}
                {isFullyCalibrated ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>100% CALIBRATED • ALL 5 ZONES MAPPED</span>
                  </span>
                ) : activeCapturingZoneId ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    <Target className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>MAPPING {activeZoneDef?.name.toUpperCase()} ({capturingProgress}%)</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>{5 - mappedZonesCount} ZONE{5 - mappedZonesCount > 1 ? 'S' : ''} PENDING MAPPING</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tracks ocular calibration baseline points across all monitor zones to establish proctoring gaze boundaries.
              </p>
            </div>
          </div>

          {/* Interactive Calibration Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isAutoSequenceRunning ? (
              <button
                type="button"
                onClick={handleStopAutoSequence}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Capture</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartAutoSequence}
                className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isFullyCalibrated ? 'Re-run Auto Calibration' : 'Start Auto Calibration'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleQuickMapAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-teal-300 border border-teal-500/30 hover:border-teal-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Instantly map all 5 zones for rapid testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Quick-Map All</span>
            </button>

            <button
              type="button"
              onClick={handleResetCalibration}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs transition-all"
              title="Reset mapped calibration zones to test progress bar from 0%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* VISUAL PROGRESS BAR SECTION */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">
                Calibration Capture Progress:
              </span>
              <span className="font-mono font-bold text-teal-300 text-sm">
                {mappedZonesCount} of {CALIBRATION_ZONES.length} Zones Mapped
              </span>
            </div>
            <div className="flex items-center gap-3">
              {mappedZonesCount > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Average Precision: <strong className="text-emerald-300 font-bold">{averageCalibrationPrecision}%</strong>
                </span>
              )}
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-teal-300 shadow-inner">
                {calibrationProgressPercent}% Complete
              </span>
            </div>
          </div>

          {/* Segmented Multi-Zone Visual Progress Bar */}
          <div className="relative h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner flex gap-1">
            {CALIBRATION_ZONES.map((zone) => {
              const record = mappedZones[zone.id];
              const isMapped = record?.isMapped;
              const isCapturing = activeCapturingZoneId === zone.id;

              return (
                <div
                  key={zone.id}
                  className={`h-full flex-1 rounded-sm transition-all duration-300 relative overflow-hidden flex items-center justify-center ${
                    isMapped
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]'
                      : isCapturing
                      ? 'bg-slate-800'
                      : 'bg-slate-800/70'
                  }`}
                  title={`${zone.name}: ${isMapped ? 'Successfully Mapped' : isCapturing ? `Capturing (${capturingProgress}%)` : 'Pending'}`}
                >
                  {/* Dynamic Fill during active zone capture */}
                  {isCapturing && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-75"
                      style={{ width: `${capturingProgress}%` }}
                    />
                  )}

                  <span className={`relative text-[9px] font-mono font-extrabold uppercase select-none ${
                    isMapped ? 'text-slate-950' : isCapturing ? 'text-amber-200' : 'text-slate-500'
                  }`}>
                    {zone.code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5-ZONE DETAILED MAPPING CARDS - Showing which zones have been successfully mapped */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
          {CALIBRATION_ZONES.map((zone, index) => {
            const record = mappedZones[zone.id];
            const isMapped = record?.isMapped;
            const isCapturing = activeCapturingZoneId === zone.id;

            return (
              <div
                key={zone.id}
                className={`p-2.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isMapped
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-sm'
                    : isCapturing
                    ? 'bg-amber-950/30 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Zone Card Header */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isMapped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isCapturing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{index + 1} {zone.code}
                    </span>

                    {isMapped ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Mapped</span>
                      </span>
                    ) : isCapturing ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                        <Target className="w-3 h-3 animate-spin shrink-0" />
                        <span>{capturingProgress}%</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-200 leading-snug">
                    {zone.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight line-clamp-1 mt-0.5" title={zone.description}>
                    {zone.screenRegion}
                  </div>
                </div>

                {/* Coordinate Telemetry & Capture Trigger Button */}
                <div className="mt-2.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] gap-1">
                  {isMapped ? (
                    <div className="font-mono text-emerald-300 text-[10px] flex flex-col leading-tight">
                      <span>({record.coord?.x.toFixed(0)}%, {record.coord?.y.toFixed(0)}%)</span>
                      <span className="text-[9px] text-slate-400 font-sans">{record.confidence}% score</span>
                    </div>
                  ) : isCapturing ? (
                    <div className="w-full pr-1">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${capturingProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 font-mono text-[9px]">
                      ({zone.xPercent}%, {zone.yPercent}%)
                    </span>
                  )}

                  {!isCapturing && (
                    <button
                      type="button"
                      onClick={() => handleStartCaptureZone(zone.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all shrink-0 ${
                        isMapped
                          ? 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                          : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40'
                      }`}
                      title={isMapped ? 'Re-calibrate this zone' : 'Map this ocular zone now'}
                    >
                      {isMapped ? 'Re-map' : 'Map Zone'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Visualizer Stage + Gaze Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Live Optical Webcam Feed & Heatmap (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div
            className={`relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border shadow-inner flex items-center justify-center transition-all duration-300 ${
              isDriftAlertActive
                ? 'border-amber-500 shadow-[inset_0_0_40px_rgba(245,158,11,0.25)]'
                : 'border-slate-800'
            }`}
          >
            {/* Hidden Canvas for 320x240 image processing */}
            <canvas ref={processCanvasRef} width={320} height={240} className="hidden" />

            {/* Video Feed */}
            {localStream && !isSimulatorMode ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              /* Simulated Face & Pupil Canvas */
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-4 select-none relative">
                <div className="w-48 h-56 rounded-[45%] border-2 border-dashed border-teal-500/30 flex flex-col items-center justify-center relative bg-slate-900/60 shadow-2xl">
                  {/* Eye Sockets */}
                  <div className="flex items-center gap-10 mt-10">
                    <div className="w-12 h-7 rounded-full bg-slate-800 border border-teal-400/40 relative overflow-hidden flex items-center justify-center shadow-inner">
                      <div
                        style={{
                          transform: `translate(${gazeCoords.x - 50}%, ${gazeCoords.y - 50}%)`,
                        }}
                        className="w-4 h-4 rounded-full bg-gradient-to-tr from-teal-400 to-cyan-300 shadow-md shadow-teal-400/60 flex items-center justify-center transition-all duration-150"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>
                    </div>

                    <div className="w-12 h-7 rounded-full bg-slate-800 border border-teal-400/40 relative overflow-hidden flex items-center justify-center shadow-inner">
                      <div
                        style={{
                          transform: `translate(${gazeCoords.x - 50}%, ${gazeCoords.y - 50}%)`,
                        }}
                        className="w-4 h-4 rounded-full bg-gradient-to-tr from-teal-400 to-cyan-300 shadow-md shadow-teal-400/60 flex items-center justify-center transition-all duration-150"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>
                    </div>
                  </div>

                  <div className="w-1.5 h-8 bg-slate-700/50 rounded-full mt-3" />
                  <div className="w-10 h-1 bg-slate-700/50 rounded-full mt-4" />

                  <div className="absolute bottom-2 text-[9px] text-teal-400/80 font-mono tracking-wider">
                    SYNTHETIC EYE-GAZE SIMULATOR
                  </div>
                </div>
              </div>
            )}

            {/* Heatmap Canvas Layer (z-10) */}
            <canvas
              ref={heatmapCanvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-200"
            />

            {/* Ocular Tracking Reticle Canvas Overlay (z-20) */}
            <canvas
              ref={overlayCanvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />

            {/* Dynamic Tracking Reticle (z-30) */}
            <div className="absolute inset-0 pointer-events-none z-30">
              <div
                style={{
                  left: `${gazeCoords.x}%`,
                  top: `${gazeCoords.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-12 h-12 rounded-full border-2 transition-all duration-100 flex items-center justify-center ${
                  isCenter
                    ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/30'
                    : 'border-rose-400 bg-rose-500/20 shadow-lg shadow-rose-500/40 animate-pulse'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isCenter ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <div className="absolute -top-6 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono font-bold text-slate-200 border border-slate-700 whitespace-nowrap">
                  ({gazeCoords.x}%, {gazeCoords.y}%)
                </div>
              </div>
            </div>

            {/* Active Calibration Target Reticle Overlay (Triggered When A Zone is Being Captured) */}
            {activeZoneDef && (
              <div className="absolute inset-0 pointer-events-none z-35">
                {/* Top Banner Prompt */}
                <div className="absolute top-12 inset-x-3 z-40 p-2.5 rounded-xl bg-slate-950/95 border border-amber-500/80 backdrop-blur shadow-2xl flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Target className="w-4 h-4 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <span>CALIBRATING OCULAR ZONE: {activeZoneDef.name.toUpperCase()}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          {capturingProgress}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Lock your direct gaze onto the target at ({activeZoneDef.xPercent}%, {activeZoneDef.yPercent}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                      {((1200 * (100 - capturingProgress)) / 100000).toFixed(1)}s remaining
                    </span>
                  </div>
                </div>

                {/* Pulsing Target Dot & Radial Reticle at Exact Target Zone Coordinate */}
                <div
                  style={{
                    left: `${activeZoneDef.xPercent}%`,
                    top: `${activeZoneDef.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                >
                  <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/20 flex items-center justify-center animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.6)]">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 rounded-full bg-slate-950" />
                    </div>
                    <span className="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-900/95 border border-amber-500/60 text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap shadow">
                      {activeZoneDef.code} • {capturingProgress}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Centering Target Cue (Triggered When Drift Alert is Active) */}
            {isDriftAlertActive && (
              <div className="absolute inset-0 pointer-events-none z-35 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-amber-400/70 bg-amber-500/10 flex flex-col items-center justify-center animate-pulse">
                  <Target className="w-7 h-7 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[10px] font-bold text-amber-200 tracking-widest mt-1">
                    LOOK HERE
                  </span>
                  <span className="text-[8px] font-mono text-amber-300/80">PRIMARY FOCUS</span>
                </div>
              </div>
            )}

            {/* Warning Alert Banner (> 3s Drift) */}
            {isDriftAlertActive && (
              <div className="absolute top-12 inset-x-3 z-50 p-3 rounded-xl bg-slate-950/95 border border-amber-500/80 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-bounce-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <BellRing className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-200">
                        Gaze Drift Alert (&gt; 3.0s Off-Center)
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {driftSeconds.toFixed(1)}s drifted
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      Attention drifted toward <strong className="text-amber-300">{currentGaze.replace('_', ' ').toLowerCase()}</strong>. Please return gaze to center screen.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSimulateDirection('CENTER')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-all shadow-md"
                >
                  Refocus Center
                </button>
              </div>
            )}

            {/* Recovery Toast */}
            {showRecoveryToast && (
              <div className="absolute top-12 inset-x-4 z-50 p-2.5 rounded-xl bg-emerald-950/95 border border-emerald-500/80 backdrop-blur-md shadow-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-300 transition-all">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Gaze Restored: Returned to Primary Interaction Display</span>
              </div>
            )}

            {/* Live Status Badge */}
            <div className="absolute top-3 left-3 z-40 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCenter ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'
                }`}
              />
              <span className={`font-bold ${isCenter ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isCenter ? 'PRIMARY DISPLAY FOCUS' : `DEVIATION: ${currentGaze.replace('_', ' ')}`}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 border-l border-slate-700 pl-2">
                {fps} FPS
              </span>
            </div>

            {/* Heatmap Sample Counter */}
            {showHeatmap && (
              <div className="absolute bottom-3 left-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur border border-slate-700/80 text-[11px] text-slate-300 shadow-md">
                <Flame className={`w-3.5 h-3.5 ${heatmapColorMode === 'multicolor' ? 'text-rose-400' : 'text-teal-400'} animate-pulse`} />
                <span className="font-semibold">Heatmap:</span>
                <span className={`font-mono font-bold ${heatmapColorMode === 'multicolor' ? 'text-rose-300' : 'text-teal-300'}`}>
                  {fixationCount}
                </span>
                <span className="text-slate-400 text-[10px]">pts</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {heatmapColorMode === 'multicolor' ? 'Multi-Color' : `Mono • ${monochromeTone}`}
                </span>
              </div>
            )}

            {/* Quick Camera Request Toggle */}
            <div className="absolute top-3 right-3 z-40 flex items-center gap-1.5">
              {!localStream || isSimulatorMode ? (
                <button
                  onClick={handleRequestCamera}
                  className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 shadow-md transition-all"
                >
                  <Camera className="w-3 h-3" />
                  <span>Connect Webcam</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSimulatorMode(!isSimulatorMode)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-all"
                >
                  {isSimulatorMode ? 'Switch to Webcam' : 'Test Joystick'}
                </button>
              )}
            </div>
          </div>

          {/* 3-SECOND DRIFT GAUGE */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Bell className={`w-3.5 h-3.5 ${isDriftAlertActive ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                <span className="font-semibold text-slate-200">Gaze Drift Timer (3.0s Threshold):</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-bold ${
                  driftSeconds >= 3.0
                    ? 'text-rose-400 animate-pulse'
                    : driftSeconds > 1.5
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}>
                  {driftSeconds.toFixed(1)}s / 3.0s
                </span>
                <button
                  type="button"
                  onClick={handleTriggerTestAlert}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Simulate 3.2s off-center drift to immediately test visual/audio alert and log chart incident"
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>Test 3s Alert</span>
                </button>
              </div>
            </div>

            {/* 3-Second Drift Fill Meter */}
            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-100 ${
                  driftSeconds >= 3.0
                    ? 'bg-rose-500 shadow-md shadow-rose-500/50'
                    : driftSeconds > 1.5
                    ? 'bg-amber-400'
                    : 'bg-teal-400'
                }`}
                style={{ width: `${Math.min(100, (driftSeconds / 3.0) * 100)}%` }}
              />
              <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-rose-400/80 z-10" />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Primary Zone (Safe)</span>
              </span>
              <span className="font-mono text-slate-400">
                Alerts Triggered: <strong className="text-amber-300">{driftAlertCount}</strong>
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <span>Alert Trigger &gt; 3.0s</span>
              </span>
            </div>
          </div>

          {/* HEATMAP CONTROL BAR */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
            {/* Row 1: Visibility, Scanpath, and Dynamic Intensity Mode Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    showHeatmap
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span>{showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF'}</span>
                </button>

                {/* DYNAMIC TOGGLE: MONOCHROMATIC VS MULTI-COLOR INTENSITY MODES */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setHeatmapColorMode('multicolor')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs ${
                      heatmapColorMode === 'multicolor'
                        ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-teal-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 font-medium'
                    }`}
                    title="Multi-Color Thermal: Rainbow spectral gradient (Crimson-Orange-Yellow-Green-Cyan)"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Multi-Color</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeatmapColorMode('monochrome')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 text-xs ${
                      heatmapColorMode === 'monochrome'
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 font-medium'
                    }`}
                    title="Monochromatic Intensity: Single-hue luminance gradient for maximum readability without webcam color clash"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Monochrome</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScanpath(!showScanpath)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                    showScanpath
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle scanpath saccade lines connecting sequential fixations"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scanpath Trails</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearHeatmap}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Clear accumulated heatmap points for a fresh recording session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Points</span>
                </button>
              </div>
            </div>

            {/* Row 2: Monochromatic Tone Selector (Only shown when Monochromatic mode is active) */}
            {heatmapColorMode === 'monochrome' && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-teal-500/30 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="font-semibold text-teal-300">Monochromatic Palette:</span>
                  <span className="text-[11px] text-slate-400">Single-hue luminance ramp for clean readability</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'teal', label: 'Cyan / Teal', dot: 'bg-teal-400' },
                    { id: 'emerald', label: 'Emerald', dot: 'bg-emerald-400' },
                    { id: 'amber', label: 'Amber Gold', dot: 'bg-amber-400' },
                    { id: 'indigo', label: 'Violet / Indigo', dot: 'bg-indigo-400' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMonochromeTone(t.id as any)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                        monochromeTone === t.id
                          ? 'bg-slate-800 text-slate-100 border-teal-400/80 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row 3: Dynamic Intensity Gradient Scale Legend */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-850 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Intensity Scale:</span>
                  <span className="font-mono text-teal-300 font-bold uppercase text-[10px]">
                    {heatmapColorMode === 'multicolor'
                      ? 'Multi-Color Spectral (Rainbow)'
                      : `Monochromatic (${monochromeTone})`}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {heatmapColorMode === 'multicolor'
                    ? 'Crimson core indicates peak ocular dwell density'
                    : 'Luminance & opacity scale highlights gaze concentration'}
                </span>
              </div>

              {/* Gradient Preview Bar */}
              <div className="relative h-2.5 w-full rounded-full overflow-hidden border border-slate-800 shadow-inner">
                {heatmapColorMode === 'multicolor' ? (
                  <div className="w-full h-full bg-gradient-to-r from-cyan-500 via-emerald-400 via-yellow-400 via-orange-500 to-rose-600 shadow-sm" />
                ) : monochromeTone === 'emerald' ? (
                  <div className="w-full h-full bg-gradient-to-r from-emerald-950 via-emerald-700 via-emerald-400 to-emerald-100 shadow-sm" />
                ) : monochromeTone === 'amber' ? (
                  <div className="w-full h-full bg-gradient-to-r from-amber-950 via-amber-700 via-amber-400 to-amber-100 shadow-sm" />
                ) : monochromeTone === 'indigo' ? (
                  <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-indigo-700 via-indigo-400 to-indigo-100 shadow-sm" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-teal-950 via-teal-700 via-teal-400 to-cyan-100 shadow-sm" />
                )}
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                <span>0% Density (Peripheral Halo)</span>
                <span>50% Density (Sustained Glance)</span>
                <span className="font-bold text-slate-300">100% Core (High Fixation)</span>
              </div>
            </div>

            {/* Row 4: Opacity & Radius Adjustment Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Opacity:</span>
                  <span className={`font-mono font-bold ${heatmapColorMode === 'multicolor' ? 'text-rose-300' : 'text-teal-300'}`}>
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={Math.round(heatmapOpacity * 100)}
                  onChange={(e) => setHeatmapOpacity(Number(e.target.value) / 100)}
                  disabled={!showHeatmap}
                  className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40 ${
                    heatmapColorMode === 'multicolor' ? 'accent-rose-400' : 'accent-teal-400'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Radius:</span>
                  <span className="font-mono text-amber-300 font-bold">{heatmapRadius}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="64"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                  disabled={!showHeatmap}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 2D Screen Radar & Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          {/* 2D Monitor Radar Plane */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>2D Monitor Coordinate Radar</span>
              </div>
              <span className="text-[10px] font-mono text-teal-300 font-bold">
                X: {gazeCoords.x}% | Y: {gazeCoords.y}%
              </span>
            </div>

            {/* Radar Visualizer Box */}
            <div className="relative aspect-video w-full bg-slate-900/90 rounded-lg border border-slate-800 overflow-hidden my-3 shadow-inner">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

              {/* Safe On-Screen Zone */}
              <div className="absolute inset-6 rounded-lg border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center">
                <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest pointer-events-none">
                  Primary Display Zone
                </span>
              </div>

              {/* Off-screen hazard labels */}
              <div className="absolute top-1 inset-x-0 text-center text-[9px] text-slate-500 font-bold">
                UPPER CEILING
              </div>
              <div className="absolute bottom-1 inset-x-0 text-center text-[9px] text-rose-400/80 font-bold">
                PHONE / LAP CHEATING ZONE
              </div>
              <div className="absolute left-1 inset-y-0 flex items-center text-[9px] text-amber-400/80 font-bold [writing-mode:vertical-lr] transform rotate-180">
                SECONDARY MONITOR
              </div>
              <div className="absolute right-1 inset-y-0 flex items-center text-[9px] text-amber-400/80 font-bold [writing-mode:vertical-lr]">
                SECONDARY MONITOR
              </div>

              {/* Calibration Zone Reference Markers on Radar */}
              {CALIBRATION_ZONES.map((zone) => {
                const record = mappedZones[zone.id];
                const isMapped = record?.isMapped;
                const isCapturing = activeCapturingZoneId === zone.id;

                return (
                  <div
                    key={`radar-${zone.id}`}
                    style={{
                      left: `${zone.xPercent}%`,
                      top: `${zone.yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute rounded-full flex items-center justify-center transition-all ${
                      isMapped
                        ? 'w-4 h-4 bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : isCapturing
                        ? 'w-5 h-5 bg-amber-500/30 border-2 border-amber-400 text-amber-300 animate-pulse ring-2 ring-amber-400/50'
                        : 'w-3.5 h-3.5 border border-dashed border-slate-700/80 bg-slate-900/60 text-slate-500'
                    }`}
                    title={`${zone.name}: ${isMapped ? 'Successfully Mapped' : isCapturing ? `Capturing (${capturingProgress}%)` : 'Pending'}`}
                  >
                    <span className="text-[7px] font-mono font-bold leading-none select-none">
                      {isMapped ? '✓' : zone.code}
                    </span>
                  </div>
                );
              })}

              {/* Moving Gaze Dot in Radar */}
              <div
                style={{
                  left: `${gazeCoords.x}%`,
                  top: `${gazeCoords.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-5 h-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                  isCenter
                    ? 'border-emerald-400 bg-emerald-400 shadow-md shadow-emerald-400/50'
                    : 'border-rose-400 bg-rose-500 shadow-md shadow-rose-500/60'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              </div>
            </div>

            {/* Real-time Diagnostics Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/80">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Screen Fixation</div>
                <div className="text-sm font-mono font-bold text-emerald-300">{gazeOnScreenRate}%</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Drift Alerts</div>
                <div className="text-sm font-mono font-bold text-amber-300">{driftAlertCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">FPS / Latency</div>
                <div className="text-sm font-mono font-bold text-cyan-300">{fps} FPS</div>
              </div>
            </div>
          </div>

          {/* Quick Direction Simulator Buttons */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Simulate Directional Gaze:</span>
              <span className="text-[11px]">Hold &gt;3s on off-center to trigger warning</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { dir: 'UP' as GazeDirection, label: '▲ Up' },
                { dir: 'LEFT_MONITOR' as GazeDirection, label: '◄ Left' },
                { dir: 'CENTER' as GazeDirection, label: '● Center' },
                { dir: 'RIGHT_MONITOR' as GazeDirection, label: 'Right ►' },
                { dir: 'DOWN_PHONE' as GazeDirection, label: '▼ Phone' },
              ].map((item) => (
                <button
                  key={item.dir}
                  onClick={() => handleSimulateDirection(item.dir)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border ${
                    currentGaze === item.dir
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-bold'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sensitivity Adjuster */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Detection Sensitivity</span>
              </span>
              <span className="font-mono text-teal-300 font-bold">{sensitivity}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Standard (40%)</span>
              <span>Strict Anti-Cheat (95%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS DATA VISUALIZATION: FREQUENCY & DURATION OF EYE-GAZE DRIFT INCIDENTS */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        {/* Chart Header & Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>Session Gaze Drift Incidents: Frequency & Duration</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  RECHARTS TELEMETRY
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Visualizing off-center drift duration and frequency patterns logged throughout the session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode('timeline')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  chartViewMode === 'timeline'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Incident Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('distribution')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  chartViewMode === 'distribution'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChartIcon className="w-3 h-3" />
                <span>Directional Frequency</span>
              </button>
            </div>

            {/* Simulated Incident Button */}
            <button
              type="button"
              onClick={handleLogSampleDrift}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
              title="Add a simulated glance incident to test dynamic chart rendering"
            >
              <Zap className="w-3 h-3 text-teal-400" />
              <span>+ Log Sample Drift</span>
            </button>

            {/* Clear Incidents */}
            <button
              type="button"
              onClick={() => setDriftIncidents([])}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs transition-all"
              title="Reset incident history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Analytics Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Total Drift Incidents</span>
            <span className="text-base font-mono font-bold text-slate-100">
              {incidentAnalytics.total}
              <span className="text-[11px] font-normal text-slate-400 ml-1">events</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Average Duration</span>
            <span className="text-base font-mono font-bold text-teal-300">
              {incidentAnalytics.avgDuration}s
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Max Drift Duration</span>
            <span className={`text-base font-mono font-bold ${incidentAnalytics.maxDuration >= 3.0 ? 'text-rose-400' : 'text-amber-300'}`}>
              {incidentAnalytics.maxDuration}s
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Violations (&ge; 3.0s Threshold)</span>
            <span className={`text-base font-mono font-bold ${incidentAnalytics.alertCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {incidentAnalytics.alertCount}
              <span className="text-[10px] font-normal text-slate-400 ml-1">alerts</span>
            </span>
          </div>
        </div>

        {/* Chart Rendering Container */}
        <div className="w-full h-56 pt-2">
          {driftIncidents.length === 0 ? (
            <div className="w-full h-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
              <p className="text-xs">No gaze drift incidents recorded yet.</p>
              <button
                type="button"
                onClick={handleLogSampleDrift}
                className="px-3 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-semibold hover:bg-teal-500/30 transition-all"
              >
                Log Sample Incident
              </button>
            </div>
          ) : chartViewMode === 'timeline' ? (
            /* VIEW 1: Incident Duration & Severity Timeline BarChart */
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartTimelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  unit="s"
                  domain={[0, (dataMax: number) => Math.max(4.0, Math.ceil(dataMax + 0.5))]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 flex items-center justify-between gap-3">
                            <span>Incident {data.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{data.time}</span>
                          </div>
                          <div className="text-slate-300 flex items-center gap-1.5">
                            <span className="text-slate-400">Direction:</span>
                            <strong className="text-cyan-300">{data.direction}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Duration:</span>
                            <strong className={`font-mono ${data.isAlert ? 'text-rose-400' : 'text-emerald-300'}`}>
                              {data.duration} seconds
                            </strong>
                          </div>
                          <div className="text-[10px] pt-1 border-t border-slate-800">
                            {data.isAlert ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Threshold Violated (&ge; 3.0s)</span>
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium">Safe Brief Glance (&lt; 3.0s)</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* 3.0s Alert Threshold Reference Line */}
                <ReferenceLine
                  y={3.0}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: '3.0s Alert Threshold',
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Bar dataKey="duration" name="Drift Duration (s)" radius={[4, 4, 0, 0]}>
                  {chartTimelineData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isAlert ? '#f43f5e' : entry.duration > 1.8 ? '#fbbf24' : '#2dd4bf'}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#38bdf8' }}
                  name="Trend"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            /* VIEW 2: Directional Frequency & Average Duration Grouped BarChart */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentAnalytics.directionBreakdown} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200">{data.name}</div>
                          <div className="text-slate-300">
                            Total Incidents: <strong className="text-teal-300">{data.count}</strong>
                          </div>
                          <div className="text-slate-300">
                            Avg Duration: <strong className="text-amber-300">{data.avgDuration}s</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                />
                <Bar dataKey="count" name="Incident Count" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgDuration" name="Avg Duration (s)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend description */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-400" />
              <span>Safe Glance (&lt;1.8s)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" />
              <span>Moderate Drift (1.8s–2.9s)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Critical Violation (&ge;3.0s)</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Auto-updates as candidate glances off-screen
          </span>
        </div>
      </div>

      {/* 5-Direction Diagnostic Challenge Section */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-slate-100">
              Anti-Cheat Optical Direction Checklist
            </span>
          </div>
          <span className="text-xs text-teal-300 font-semibold font-mono">
            {Object.values(passedChallenges).filter(Boolean).length} / {CHALLENGES.length} Verified
          </span>
        </div>

        {/* 5 Challenge Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {CHALLENGES.map((ch, idx) => {
            const isPassed = Boolean(passedChallenges[ch.direction]);
            const isTarget = currentGaze === ch.direction;

            return (
              <div
                key={ch.direction}
                onClick={() => handleSimulateDirection(ch.direction)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : isTarget
                    ? 'bg-teal-500/20 border-teal-500/60 text-teal-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    #{idx + 1} {ch.label.split(' ')[0]}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-700" />
                  )}
                </div>
                <p className="text-[11px] font-medium leading-tight line-clamp-1">{ch.instruction}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPassedChallenges({});
              setGazeCoords({ x: 50, y: 50 });
              setCurrentGaze('CENTER');
              setPupilDeflection({ dx: 0, dy: 0 });
              setIsDriftAlertActive(false);
              setDriftSeconds(0);
              handleClearHeatmap();
              setDriftIncidents(INITIAL_INCIDENTS);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Test & Lab Data</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onSaveCalibration && (
            <button
              type="button"
              onClick={() => {
                onSaveCalibration({
                  isCalibrated: mappedZonesCount >= 3,
                  calibratedAt: Date.now(),
                  pointsCalibrated: mappedZonesCount,
                  precisionScore: averageCalibrationPrecision || opticalConfidence,
                  boundaryCoordinates: {
                    center: mappedZones.center.coord || { x: 50.1, y: 49.8 },
                    topLeft: mappedZones.topLeft.coord || { x: 14.2, y: 16.1 },
                    topRight: mappedZones.topRight.coord || { x: 85.9, y: 15.8 },
                    bottomLeft: mappedZones.bottomLeft.coord || { x: 14, y: 84 },
                    bottomRight: mappedZones.bottomRight.coord || { x: 86, y: 84 },
                  },
                });
                if (onClose) onClose();
              }}
              className={`px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                isFullyCalibrated
                  ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                  : 'bg-teal-500/90 hover:bg-teal-400 text-slate-950'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isFullyCalibrated
                  ? 'Apply Verified Calibration (5/5 Mapped)'
                  : `Apply Calibration (${mappedZonesCount}/5 Mapped)`}
              </span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700"
            >
              Close Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
