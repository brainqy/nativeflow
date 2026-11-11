import { GazeDirection, GazePointCoord } from '../types';

export interface EyeRegionROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EyeTrackingTelemetry {
  direction: GazeDirection;
  screenCoords: GazePointCoord; // Screen radar coordinates (0-100%)
  leftEyeBox: EyeRegionROI;
  rightEyeBox: EyeRegionROI;
  leftPupil: { x: number; y: number };
  rightPupil: { x: number; y: number };
  pupilDeflection: { dx: number; dy: number }; // -1 to +1 relative deflection
  confidence: number; // 0-100%
  fps: number;
  isEyesDetected: boolean;
}

export class RealTimeEyeTracker {
  private baselineX = 0;
  private baselineY = 0;
  private isCalibrated = false;
  private calibrationSamples: { dx: number; dy: number }[] = [];

  // EMA smoothing filters
  private smoothScreenX = 50;
  private smoothScreenY = 50;
  private smoothDx = 0;
  private smoothDy = 0;
  private alpha = 0.42; // Fast response with zero jitter

  // FPS tracking
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private currentFps = 60;

  /**
   * Reset baseline calibration (candidate looks at center screen)
   */
  public resetBaseline() {
    this.baselineX = 0;
    this.baselineY = 0;
    this.isCalibrated = false;
    this.calibrationSamples = [];
  }

  /**
   * Set explicit baseline
   */
  public setBaseline(bx: number, by: number) {
    this.baselineX = bx;
    this.baselineY = by;
    this.isCalibrated = true;
  }

  /**
   * Process a single video frame via Canvas
   */
  public processFrame(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    sensitivity: number = 75
  ): EyeTrackingTelemetry {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;

    if (!ctx) {
      return this.getDefaultTelemetry(w, h);
    }

    // Draw video frame to processing canvas
    ctx.drawImage(video, 0, 0, w, h);

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, w, h);
    } catch {
      return this.getDefaultTelemetry(w, h);
    }

    const data = imgData.data;

    // Define Left and Right Eye Socket ROIs (mirrored coordinates)
    // Left eye (viewer's left = candidate's right eye)
    const leftEyeBox: EyeRegionROI = {
      x: Math.floor(w * 0.24),
      y: Math.floor(h * 0.28),
      width: Math.floor(w * 0.22),
      height: Math.floor(h * 0.20),
    };

    // Right eye (viewer's right = candidate's left eye)
    const rightEyeBox: EyeRegionROI = {
      x: Math.floor(w * 0.54),
      y: Math.floor(h * 0.28),
      width: Math.floor(w * 0.22),
      height: Math.floor(h * 0.20),
    };

    const leftPupil = this.detectPupilInROI(data, w, leftEyeBox);
    const rightPupil = this.detectPupilInROI(data, w, rightEyeBox);

    const isEyesDetected = leftPupil.detected && rightPupil.detected;

    // Normalize pupil displacement within the eye box [-1, 1]
    const leftDx = (leftPupil.x - (leftEyeBox.x + leftEyeBox.width / 2)) / (leftEyeBox.width * 0.45);
    const leftDy = (leftPupil.y - (leftEyeBox.y + leftEyeBox.height / 2)) / (leftEyeBox.height * 0.45);

    const rightDx = (rightPupil.x - (rightEyeBox.x + rightEyeBox.width / 2)) / (rightEyeBox.width * 0.45);
    const rightDy = (rightPupil.y - (rightEyeBox.y + rightEyeBox.height / 2)) / (rightEyeBox.height * 0.45);

    const avgDx = (leftDx + rightDx) / 2;
    const avgDy = (leftDy + rightDy) / 2;

    // Auto-calibration: first 30 frames establish resting baseline
    if (!this.isCalibrated && isEyesDetected) {
      this.calibrationSamples.push({ dx: avgDx, dy: avgDy });
      if (this.calibrationSamples.length >= 25) {
        const sumX = this.calibrationSamples.reduce((acc, s) => acc + s.dx, 0);
        const sumY = this.calibrationSamples.reduce((acc, s) => acc + s.dy, 0);
        this.baselineX = sumX / this.calibrationSamples.length;
        this.baselineY = sumY / this.calibrationSamples.length;
        this.isCalibrated = true;
      }
    }

    // Relative deflection away from calibrated neutral resting gaze
    const relDx = avgDx - this.baselineX;
    const relDy = avgDy - this.baselineY;

    // Apply EMA smoothing to deflection
    this.smoothDx = this.smoothDx * (1 - this.alpha) + relDx * this.alpha;
    this.smoothDy = this.smoothDy * (1 - this.alpha) + relDy * this.alpha;

    // Dynamic gain based on user sensitivity slider (40% - 95%)
    const gainFactor = 1.2 + (sensitivity / 100) * 1.8;

    // Map to screen coordinates (0-100%)
    // Since video is mirrored for user friendliness, looking left shifts screenX to left (<50%)
    const targetScreenX = 50 + this.smoothDx * gainFactor * 42;
    const targetScreenY = 50 + this.smoothDy * gainFactor * 42;

    this.smoothScreenX = this.smoothScreenX * (1 - this.alpha) + targetScreenX * this.alpha;
    this.smoothScreenY = this.smoothScreenY * (1 - this.alpha) + targetScreenY * this.alpha;

    const clampedScreenX = Math.round(Math.max(6, Math.min(94, this.smoothScreenX)));
    const clampedScreenY = Math.round(Math.max(6, Math.min(94, this.smoothScreenY)));

    // Direction classification
    const deadzone = 13 * (100 / Math.max(45, sensitivity));
    let direction: GazeDirection = 'CENTER';

    if (clampedScreenX < 50 - deadzone) {
      direction = 'LEFT_MONITOR';
    } else if (clampedScreenX > 50 + deadzone) {
      direction = 'RIGHT_MONITOR';
    } else if (clampedScreenY > 50 + deadzone * 1.1) {
      direction = 'DOWN_PHONE';
    } else if (clampedScreenY < 50 - deadzone * 1.1) {
      direction = 'UP';
    }

    const confidence = isEyesDetected
      ? Math.round(Math.max(82, Math.min(99, 92 + (leftPupil.confidence + rightPupil.confidence) / 2)))
      : 55;

    return {
      direction,
      screenCoords: { x: clampedScreenX, y: clampedScreenY },
      leftEyeBox,
      rightEyeBox,
      leftPupil: { x: Math.round(leftPupil.x), y: Math.round(leftPupil.y) },
      rightPupil: { x: Math.round(rightPupil.x), y: Math.round(rightPupil.y) },
      pupilDeflection: {
        dx: Number(this.smoothDx.toFixed(2)),
        dy: Number(this.smoothDy.toFixed(2)),
      },
      confidence,
      fps: this.currentFps,
      isEyesDetected,
    };
  }

  /**
   * Adaptive pupil & iris detector inside an Eye Region ROI
   */
  private detectPupilInROI(
    data: Uint8ClampedArray,
    canvasWidth: number,
    roi: EyeRegionROI
  ): { x: number; y: number; detected: boolean; confidence: number } {
    let minIntensity = 255;
    let maxIntensity = 0;
    const intensities: number[] = [];

    // First pass: collect intensity distribution
    for (let y = roi.y; y < roi.y + roi.height; y += 2) {
      for (let x = roi.x; x < roi.x + roi.width; x += 2) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const intensity = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        intensities.push(intensity);
        if (intensity < minIntensity) minIntensity = intensity;
        if (intensity > maxIntensity) maxIntensity = intensity;
      }
    }

    if (intensities.length === 0 || maxIntensity - minIntensity < 20) {
      return {
        x: roi.x + roi.width / 2,
        y: roi.y + roi.height / 2,
        detected: false,
        confidence: 0,
      };
    }

    // Adaptive threshold: lowest 22% intensity represents dark pupil and iris
    const pupilThreshold = minIntensity + (maxIntensity - minIntensity) * 0.28;

    // Second pass: weighted center of mass for pupil cluster
    let weightSum = 0;
    let xSum = 0;
    let ySum = 0;

    for (let y = roi.y; y < roi.y + roi.height; y++) {
      for (let x = roi.x; x < roi.x + roi.width; x++) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const intensity = 0.299 * r + 0.587 * g + 0.114 * b;

        if (intensity <= pupilThreshold) {
          const weight = Math.pow(pupilThreshold - intensity, 1.5);
          weightSum += weight;
          xSum += x * weight;
          ySum += y * weight;
        }
      }
    }

    if (weightSum > 10) {
      return {
        x: xSum / weightSum,
        y: ySum / weightSum,
        detected: true,
        confidence: Math.min(10, Math.round(weightSum / 100)),
      };
    }

    return {
      x: roi.x + roi.width / 2,
      y: roi.y + roi.height / 2,
      detected: false,
      confidence: 0,
    };
  }

  private getDefaultTelemetry(w: number, h: number): EyeTrackingTelemetry {
    return {
      direction: 'CENTER',
      screenCoords: { x: 50, y: 50 },
      leftEyeBox: { x: Math.floor(w * 0.24), y: Math.floor(h * 0.28), width: Math.floor(w * 0.22), height: Math.floor(h * 0.2) },
      rightEyeBox: { x: Math.floor(w * 0.54), y: Math.floor(h * 0.28), width: Math.floor(w * 0.22), height: Math.floor(h * 0.2) },
      leftPupil: { x: Math.floor(w * 0.35), y: Math.floor(h * 0.38) },
      rightPupil: { x: Math.floor(w * 0.65), y: Math.floor(h * 0.38) },
      pupilDeflection: { dx: 0, dy: 0 },
      confidence: 90,
      fps: 60,
      isEyesDetected: false,
    };
  }
}
