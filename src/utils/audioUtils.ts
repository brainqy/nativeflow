/**
 * Audio processing utilities for Gemini Live API (16kHz in, 24kHz out PCM)
 * and Web Audio API synchronized playback.
 */

// Helper to convert Float32Array (from AudioContext) to 16kHz 16-bit PCM Linear Base64
export function floatTo16BitPCMBase64(
  inputData: Float32Array,
  inputSampleRate: number
): string {
  const targetSampleRate = 16000;
  let resampledData: Float32Array;

  if (inputSampleRate === targetSampleRate) {
    resampledData = inputData;
  } else {
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(inputData.length / ratio);
    resampledData = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originalIndex = Math.floor(i * ratio);
      resampledData[i] = inputData[originalIndex];
    }
  }

  // Convert to 16-bit PCM Little Endian
  const buffer = new ArrayBuffer(resampledData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < resampledData.length; i++) {
    const s = Math.max(-1, Math.min(1, resampledData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 16-bit PCM (24kHz little-endian) to AudioBuffer for playback
export function pcmBase64ToAudioBuffer(
  base64String: string,
  audioCtx: AudioContext,
  sampleRate = 24000
): AudioBuffer {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16View = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16View.length);

  for (let i = 0; i < int16View.length; i++) {
    float32Array[i] = int16View[i] / 32768.0;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Array);
  return audioBuffer;
}

export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private sampleRate = 24000;
  public analyser: AnalyserNode | null = null;

  // Turn timing tracking for real-time subtitle alignment
  private turnStartAudioTime = 0;
  private isTurnActive = false;

  // Callbacks for real-time synchronization with subtitles and visualizers
  public onPlaybackStateChange?: (isPlaying: boolean) => void;
  public onChunkProgress?: (durationSec: number) => void;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  public init() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: this.sampleRate });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public startNewTurn() {
    this.init();
    this.turnStartAudioTime = 0;
    this.isTurnActive = true;
  }

  public queueChunk(base64Audio: string) {
    if (!base64Audio) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const audioBuffer = pcmBase64ToAudioBuffer(base64Audio, this.audioCtx, this.sampleRate);
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(this.audioCtx.destination);
      }

      const currentTime = this.audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02; // Small lead-in buffer to eliminate pop/clicks
      }

      // If starting a fresh turn, anchor the turn start time
      if (!this.isTurnActive || this.turnStartAudioTime === 0 || this.activeSources.length === 0) {
        this.turnStartAudioTime = this.nextStartTime;
        this.isTurnActive = true;
      }

      const startTime = this.nextStartTime;
      source.start(startTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      // Trigger playback start if this is the first active source
      if (this.activeSources.length === 1 && this.onPlaybackStateChange) {
        this.onPlaybackStateChange(true);
      }

      if (this.onChunkProgress) {
        this.onChunkProgress(audioBuffer.duration);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx > -1) {
          this.activeSources.splice(idx, 1);
        }
        // If all scheduled sources have concluded, inform listeners that audio is finished
        if (this.activeSources.length === 0) {
          this.isTurnActive = false;
          if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange(false);
          }
        }
      };
    } catch (err) {
      console.warn('Error decoding or scheduling audio chunk:', err);
    }
  }

  /**
   * Returns exact playback progress of current audio turn from 0.0 to 1.0.
   */
  public getPlaybackProgress(): { progress: number; elapsedSec: number; totalSec: number; isPlaying: boolean } {
    if (!this.audioCtx || !this.isTurnActive || this.turnStartAudioTime === 0) {
      return { progress: 0, elapsedSec: 0, totalSec: 0, isPlaying: false };
    }
    const total = Math.max(0.001, this.nextStartTime - this.turnStartAudioTime);
    const elapsed = Math.max(0, this.audioCtx.currentTime - this.turnStartAudioTime);
    const progress = Math.min(1.0, Math.max(0, elapsed / total));
    const isPlaying = this.activeSources.length > 0 && this.audioCtx.currentTime < this.nextStartTime;
    return { progress, elapsedSec: elapsed, totalSec: total, isPlaying };
  }

  public getRemainingPlaybackDuration(): number {
    if (!this.audioCtx) return 0;
    return Math.max(0, this.nextStartTime - this.audioCtx.currentTime);
  }

  public isCurrentlyPlaying(): boolean {
    if (!this.audioCtx) return false;
    return this.activeSources.length > 0 && this.audioCtx.currentTime < this.nextStartTime;
  }

  public stopAndClear() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may have ended
      }
    }
    this.activeSources = [];
    this.isTurnActive = false;
    this.turnStartAudioTime = 0;
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
  }

  public close() {
    this.stopAndClear();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

// Simple helper to play base64 PCM or standard base64 audio
export async function playSinglePcmAudio(base64Audio: string, sampleRate = 24000): Promise<void> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass({ sampleRate });
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const audioBuffer = pcmBase64ToAudioBuffer(base64Audio, ctx, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      ctx.close();
      resolve();
    };
    source.start(0);
  });
}
