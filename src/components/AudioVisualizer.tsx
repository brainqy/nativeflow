import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart2, CircleDot, Volume2 } from 'lucide-react';

export type VisualizerMode = 'oscilloscope' | 'frequency' | 'orb';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: 'teal' | 'cyan' | 'purple' | 'amber' | 'emerald';
  height?: number;
  mode?: VisualizerMode;
  showControls?: boolean;
  onModeChange?: (mode: VisualizerMode) => void;
  label?: string;
  isAiSpeaking?: boolean;
  isUserSpeaking?: boolean;
  showDecibelMeter?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isActive,
  color = 'cyan',
  height = 90,
  mode = 'oscilloscope',
  showControls = false,
  onModeChange,
  label,
  isAiSpeaking = false,
  isUserSpeaking = false,
  showDecibelMeter = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentMode, setCurrentMode] = useState<VisualizerMode>(mode);
  const [dbLevel, setDbLevel] = useState<number>(-60);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const handleModeToggle = (newMode: VisualizerMode) => {
    setCurrentMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 340;
    const h = height;

    canvas.width = width * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let fftSize = 512;
    if (analyser) {
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.8;
    }

    const timeDataArray = new Uint8Array(fftSize);
    const freqDataArray = new Uint8Array(fftSize / 2);

    let phase = 0;
    let smoothedVolume = 0;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      ctx.clearRect(0, 0, width, h);

      let currentVolume = 0;
      let hasRealAudio = false;

      if (analyser && isActive) {
        analyser.getByteTimeDomainData(timeDataArray);
        analyser.getByteFrequencyData(freqDataArray);

        // Calculate Root-Mean-Square (RMS) amplitude from time-domain data
        let sumSquares = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const norm = (timeDataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeDataArray.length);
        currentVolume = rms; // 0 to 1

        if (currentVolume > 0.005) {
          hasRealAudio = true;
        }
      } else if (isActive && (isAiSpeaking || isUserSpeaking)) {
        // Synthetic animation if audio node not piped directly
        currentVolume = 0.2 + Math.sin(phase * 4) * 0.15 + Math.random() * 0.08;
        hasRealAudio = true;
      }

      // Smooth volume transitions
      smoothedVolume += (currentVolume - smoothedVolume) * 0.25;

      // Update decibel estimation
      if (showDecibelMeter) {
        const calculatedDb = Math.round(20 * Math.log10(Math.max(0.0001, smoothedVolume)));
        const clampedDb = Math.max(-60, Math.min(0, calculatedDb));
        setDbLevel(clampedDb);
      }

      phase += 0.05;

      // Theme Colors Definition
      let strokeColor = '#2dd4bf'; // teal
      let glowColor = 'rgba(45, 212, 191, 0.4)';
      let secondaryColor = 'rgba(20, 184, 166, 0.25)';

      if (color === 'cyan') {
        strokeColor = '#38bdf8';
        glowColor = 'rgba(56, 189, 248, 0.45)';
        secondaryColor = 'rgba(14, 165, 233, 0.25)';
      } else if (color === 'purple') {
        strokeColor = '#c084fc';
        glowColor = 'rgba(192, 132, 252, 0.45)';
        secondaryColor = 'rgba(147, 51, 234, 0.25)';
      } else if (color === 'emerald') {
        strokeColor = '#34d399';
        glowColor = 'rgba(52, 211, 153, 0.45)';
        secondaryColor = 'rgba(16, 185, 129, 0.25)';
      } else if (color === 'amber') {
        strokeColor = '#fbbf24';
        glowColor = 'rgba(251, 191, 36, 0.45)';
        secondaryColor = 'rgba(217, 119, 6, 0.25)';
      }

      // 1. OSCILLOSCOPE TIME-DOMAIN REAL WAVEFORM
      if (currentMode === 'oscilloscope') {
        // Draw center baseline
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glow Layer
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isActive && (hasRealAudio || isUserSpeaking || isAiSpeaking) ? 14 : 2;

        // Primary waveform trace
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();

        const bufferLength = timeDataArray.length;
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v = 0;
          if (analyser && isActive) {
            v = timeDataArray[i] / 128.0; // 0.0 to 2.0 (1.0 is silent center)
          } else if (isActive && (isAiSpeaking || isUserSpeaking)) {
            v = 1.0 + Math.sin(i * 0.15 + phase * 3) * smoothedVolume * 0.8;
          } else {
            v = 1.0 + Math.sin(i * 0.05 + phase) * 0.03; // idle flat breathing line
          }

          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Secondary mirrored / harmonic gradient wave
        if (isActive && (hasRealAudio || isUserSpeaking || isAiSpeaking)) {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = secondaryColor;
          ctx.beginPath();
          x = 0;
          for (let i = 0; i < bufferLength; i += 2) {
            let v = 0;
            if (analyser && isActive) {
              const sample = (timeDataArray[i] - 128) * 0.65;
              v = (128 - sample) / 128.0;
            } else {
              v = 1.0 - Math.sin(i * 0.15 + phase * 2.5) * smoothedVolume * 0.6;
            }
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth * 2;
          }
          ctx.stroke();
        }
        return;
      }

      // 2. FREQUENCY SPECTRUM BARS
      if (currentMode === 'frequency') {
        const barCount = 36;
        const barWidth = (width / barCount) - 2;
        const step = Math.floor(freqDataArray.length / barCount);

        for (let i = 0; i < barCount; i++) {
          let val = 0;
          if (analyser && isActive) {
            val = freqDataArray[i * step] / 255;
          } else if (isActive && (isAiSpeaking || isUserSpeaking)) {
            val = Math.max(0.1, (Math.sin(i * 0.4 + phase * 2) * 0.5 + 0.5) * smoothedVolume * 1.5);
          } else {
            val = 0.04;
          }

          const barHeight = Math.max(3, val * (h * 0.88));
          const barX = i * (barWidth + 2);
          const barY = h - barHeight;

          // Gradient for each bar
          const barGrad = ctx.createLinearGradient(barX, barY, barX, h);
          barGrad.addColorStop(0, strokeColor);
          barGrad.addColorStop(1, 'rgba(15, 23, 42, 0.4)');

          ctx.fillStyle = barGrad;
          ctx.fillRect(barX, barY, barWidth, barHeight);

          // Top cap indicator dot
          if (barHeight > 8) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(barX, barY, barWidth, 1.5);
          }
        }
        return;
      }

      // 3. SOUND ORB / RADIAL PULSE
      if (currentMode === 'orb') {
        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(width, h) * 0.26;
        const dynamicRadius = baseRadius + smoothedVolume * 32;

        // Multi-tier radial gradient glow
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.3,
          centerX,
          centerY,
          dynamicRadius * 1.8
        );

        gradient.addColorStop(0, isActive ? glowColor : 'rgba(71, 85, 105, 0.2)');
        gradient.addColorStop(0.6, isActive ? secondaryColor : 'rgba(51, 65, 85, 0.1)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Wave ripple rings around the orb when speaking
        if (isActive && (hasRealAudio || isUserSpeaking || isAiSpeaking)) {
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, dynamicRadius * 1.3 + Math.sin(phase * 3) * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner solid core
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isActive ? 18 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        return;
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isActive, color, currentMode, isAiSpeaking, isUserSpeaking, height, showDecibelMeter]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Header Bar with Label, Decibel Meter, and Mode Toggles */}
      {(label || showControls || showDecibelMeter) && (
        <div className="flex items-center justify-between w-full mb-1.5 px-1">
          <div className="flex items-center gap-2">
            {label && (
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive && (isUserSpeaking || isAiSpeaking)
                      ? 'bg-cyan-400 animate-ping'
                      : isActive
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                {label}
              </span>
            )}

            {showDecibelMeter && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-400">
                {isActive ? `${dbLevel} dB` : 'Muted'}
              </span>
            )}
          </div>

          {/* Mode Switcher Buttons */}
          {showControls && (
            <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => handleModeToggle('oscilloscope')}
                className={`p-1 rounded flex items-center gap-1 transition-all ${
                  currentMode === 'oscilloscope'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Time-Domain Real Oscilloscope Wave"
              >
                <Activity className="w-3 h-3" />
                <span className="hidden sm:inline">Wave</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeToggle('frequency')}
                className={`p-1 rounded flex items-center gap-1 transition-all ${
                  currentMode === 'frequency'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Frequency Spectrum Bars"
              >
                <BarChart2 className="w-3 h-3" />
                <span className="hidden sm:inline">Spectrum</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeToggle('orb')}
                className={`p-1 rounded flex items-center gap-1 transition-all ${
                  currentMode === 'orb'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Radial Voice Orb"
              >
                <CircleDot className="w-3 h-3" />
                <span className="hidden sm:inline">Orb</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visualizer Canvas */}
      <div className="w-full relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 shadow-inner">
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px` }}
          className="w-full block"
        />

        {/* Live Audio Activity Overlay Badge */}
        {isActive && (isUserSpeaking || isAiSpeaking) && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-semibold text-cyan-300 shadow-sm backdrop-blur-sm animate-pulse">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>Voice Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
