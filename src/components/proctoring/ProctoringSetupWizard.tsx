import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  CreditCard,
  Crosshair,
  Monitor,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  CandidateResumeProfile,
  GovernmentIdVerification,
  GazeCalibrationData,
  DualAudioMetrics,
} from '../../types';
import { ResumeUploadModal } from './ResumeUploadModal';
import { GovernmentIdVerificationModal } from './GovernmentIdVerificationModal';
import { GazeCalibrationModal } from './GazeCalibrationModal';
import { ScreenShareFullscreenModal } from './ScreenShareFullscreenModal';

interface ProctoringSetupWizardProps {
  isOpen: boolean;
  initialStep?: number;
  onClose: () => void;
  onComplete: (data: {
    resumeProfile: CandidateResumeProfile;
    idVerification: GovernmentIdVerification;
    gazeCalibration: GazeCalibrationData;
  }) => void;
  // Hook bindings
  resumeProfile: CandidateResumeProfile | null;
  setResumeProfile: (profile: CandidateResumeProfile) => void;
  idVerification: GovernmentIdVerification | null;
  setIdVerification: (idData: GovernmentIdVerification) => void;
  gazeCalibration: GazeCalibrationData | null;
  setGazeCalibration: (calibration: GazeCalibrationData) => void;
  cameraStream: MediaStream | null;
  onStartCamera: () => Promise<MediaStream | null>;
  screenStream: MediaStream | null;
  onStartScreenSharing: () => Promise<MediaStream | null>;
  isScreenSharingActive: boolean;
  displaySurface: 'monitor' | 'window' | 'browser' | 'none';
  isFullscreen: boolean;
  onRequestFullscreen: () => Promise<void>;
  dualAudioMetrics: DualAudioMetrics;
}

export const ProctoringSetupWizard: React.FC<ProctoringSetupWizardProps> = ({
  isOpen,
  initialStep = 1,
  onClose,
  onComplete,
  resumeProfile,
  setResumeProfile,
  idVerification,
  setIdVerification,
  gazeCalibration,
  setGazeCalibration,
  cameraStream,
  onStartCamera,
  screenStream,
  onStartScreenSharing,
  isScreenSharingActive,
  displaySurface,
  isFullscreen,
  onRequestFullscreen,
  dualAudioMetrics,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // Sync initialStep if it changes when wizard opens
  useEffect(() => {
    if (initialStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep, isOpen]);

  if (!isOpen) return null;

  const handleResumeSuccess = (profile: CandidateResumeProfile) => {
    setResumeProfile(profile);
    setCurrentStep(2);
  };

  const handleIdSuccess = (verification: GovernmentIdVerification) => {
    setIdVerification(verification);
    setCurrentStep(3);
  };

  const handleCalibrationSuccess = (calibration: GazeCalibrationData) => {
    setGazeCalibration(calibration);
    setCurrentStep(4);
  };

  const handleFinalLaunch = () => {
    if (resumeProfile && idVerification && gazeCalibration) {
      onComplete({
        resumeProfile,
        idVerification,
        gazeCalibration,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Step Progress Bar Tracker */}
        <div className="w-full mb-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 px-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">
                Enterprise AI Proctoring & Anti-Cheat Suite
              </h4>
              <p className="text-[10px] text-slate-400">
                Pre-Interview Biometric Onboarding & Environmental Verification
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Resume', icon: FileText, done: Boolean(resumeProfile) },
              { num: 2, label: 'ID Photo', icon: CreditCard, done: Boolean(idVerification) },
              { num: 3, label: 'Eye Gaze', icon: Crosshair, done: Boolean(gazeCalibration) },
              { num: 4, label: 'Screen & Audio', icon: Monitor, done: isScreenSharingActive && isFullscreen },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPassed = step.done && !isActive;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    // Allow navigating freely between steps for setup and testing
                    setCurrentStep(step.num);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : isPassed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <step.icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Views */}
        {currentStep === 1 && (
          <ResumeUploadModal
            initialProfile={resumeProfile}
            onSuccess={handleResumeSuccess}
            onCancel={onClose}
          />
        )}

        {currentStep === 2 && (
          <GovernmentIdVerificationModal
            resumeProfile={resumeProfile}
            cameraStream={cameraStream}
            onStartCamera={onStartCamera}
            initialVerification={idVerification}
            onSuccess={handleIdSuccess}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <GazeCalibrationModal
            cameraStream={cameraStream}
            onSuccess={handleCalibrationSuccess}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <ScreenShareFullscreenModal
            isScreenSharingActive={isScreenSharingActive}
            displaySurface={displaySurface}
            screenStream={screenStream}
            isFullscreen={isFullscreen}
            dualAudioMetrics={dualAudioMetrics}
            onStartScreenSharing={onStartScreenSharing}
            onRequestFullscreen={onRequestFullscreen}
            onSuccess={handleFinalLaunch}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </div>
    </div>
  );
};
