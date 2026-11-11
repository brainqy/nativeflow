import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LiveVoiceRoom } from './components/LiveVoiceRoom';
import { ScenarioSelector } from './components/ScenarioSelector';
import { VocabularyDrawer } from './components/VocabularyDrawer';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { HistoryModal } from './components/HistoryModal';
import { ProctoringHUD } from './components/proctoring/ProctoringHUD';
import { FullscreenLockoutOverlay } from './components/proctoring/FullscreenLockoutOverlay';
import { ProctoringSetupWizard } from './components/proctoring/ProctoringSetupWizard';
import { EyeGazeTestingLab } from './components/proctoring/EyeGazeTestingLab';
import { useProctoring } from './hooks/useProctoring';
import {
  ConversationScenario,
  CEFRLevel,
  LanguageOption,
  DialogueMessage,
  SessionSummary,
  SavedSession,
  PracticeSessionBooking,
} from './types';
import { SUPPORTED_LANGUAGES, PRESET_SCENARIOS } from './data/presetScenarios';
import {
  getSavedSessions,
  autoSaveCurrentSession,
  saveSession,
} from './utils/sessionStorage';
import { InterviewHubHeader } from './components/interview-prep/InterviewHubHeader';
import { InterviewHubPage } from './components/interview-prep/InterviewHubPage';
import { PracticeSetupDialog } from './components/interview-prep/PracticeSetupDialog';
import { UpcomingSessionsList } from './components/interview-prep/UpcomingSessionsList';
import {
  getWalletBalance,
  getUpcomingBookings,
  saveBooking,
  cancelBooking,
} from './utils/bookingStorage';

export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const [currentCefr, setCurrentCefr] = useState<CEFRLevel>('C1 Advanced');
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario>(PRESET_SCENARIOS[0]);
  
  // Track active session ID for local storage auto-save
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [savedSessionCount, setSavedSessionCount] = useState<number>(() => getSavedSessions().length);

  // Modals & Drawers
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isVocabularyOpen, setIsVocabularyOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isProctoringWizardOpen, setIsProctoringWizardOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<number>(1);
  const [isEyeGazeLabOpen, setIsEyeGazeLabOpen] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Interview Prep Hub & Scheduling State
  const [currentView, setCurrentView] = useState<'hub' | 'room'>('hub');
  const [isPracticeSetupOpen, setIsPracticeSetupOpen] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<'hub' | 'upcoming' | 'history'>('hub');
  const [walletBalance, setWalletBalance] = useState<number>(() => getWalletBalance());
  const [upcomingBookings, setUpcomingBookings] = useState<PracticeSessionBooking[]>(() => getUpcomingBookings());
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [sessionNotification, setSessionNotification] = useState<string | null>(null);

  // AI Proctoring & Anti-Cheat Suite hook
  const proctoring = useProctoring({
    onStrikeThresholdReached: (strikes) => {
      console.warn(`[AntiCheat] Candidate strike threshold reached: ${strikes}`);
    },
  });

  // Messages in active scenario
  const [messages, setMessages] = useState<DialogueMessage[]>([]);

  // When selectedScenario changes without resuming an existing session, initialize starter message
  const isResumingRef = useRef(false);

  useEffect(() => {
    if (isResumingRef.current) {
      isResumingRef.current = false;
      return;
    }

    if (selectedScenario) {
      setCurrentSessionId(`session-${Date.now()}`);
      setSessionSummary(null);
      setMessages([
        {
          id: `starter-${selectedScenario.id}`,
          role: 'model',
          text: selectedScenario.starterMessage,
          translation: selectedScenario.starterTranslation,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [selectedScenario]);

  // Auto-save transcript to local storage whenever dialogue updates
  useEffect(() => {
    if (messages.length > 1 && selectedScenario) {
      autoSaveCurrentSession(currentSessionId, selectedScenario, messages, sessionSummary);
      setSavedSessionCount(getSavedSessions().length);
    }
  }, [messages, sessionSummary, currentSessionId, selectedScenario]);

  // Handle language switch
  const handleSelectLanguage = (lang: LanguageOption) => {
    setCurrentLanguage(lang);
    // Find matching preset for this language if available
    const matchingPreset = PRESET_SCENARIOS.find(
      (s) => s.targetLanguage.toLowerCase() === lang.id.toLowerCase()
    );
    if (matchingPreset) {
      setSelectedScenario(matchingPreset);
    } else {
      // Create a default scenario for the language
      setSelectedScenario({
        ...PRESET_SCENARIOS[0],
        id: `default-${lang.id}`,
        targetLanguage: lang.name,
      });
    }
  };

  // Handle Session Assessment
  const handleEndAndEvaluateSession = async () => {
    // Cleanly stop any ongoing proctoring camera or screen sharing streams
    if (proctoring.cameraStream) {
      proctoring.cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (proctoring.screenStream) {
      proctoring.screenStream.getTracks().forEach((track) => track.stop());
    }
    setIsLiveConnected(false);

    if (messages.length < 2) {
      setSessionNotification(
        '💡 Please answer Question 1 (via microphone or the text response bar) before generating your interview report.'
      );
      setTimeout(() => setSessionNotification(null), 6000);
      return;
    }
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/feedback/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: selectedScenario,
          messages,
          targetLanguage: currentLanguage.name,
          cefrLevel: currentCefr,
          proctoringData: proctoring.getProctoringSummary(),
        }),
      });

      if (!res.ok) throw new Error('Failed to evaluate session');
      const data: SessionSummary = await res.json();
      setSessionSummary(data);
      setIsSummaryModalOpen(true);

      // Persist completed assessment with session in localStorage
      autoSaveCurrentSession(currentSessionId, selectedScenario, messages, data);
      setSavedSessionCount(getSavedSessions().length);
    } catch (err) {
      console.error(err);
      alert('Could not generate session assessment. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Resume a past session from local storage
  const handleResumePastSession = (session: SavedSession) => {
    isResumingRef.current = true;
    setCurrentSessionId(session.id);
    setCurrentCefr(session.cefrLevel);
    
    // Find matching language option
    const matchedLang = SUPPORTED_LANGUAGES.find(
      (l) => l.name.toLowerCase() === session.targetLanguage.toLowerCase() ||
             l.id.toLowerCase() === session.targetLanguage.toLowerCase()
    ) || SUPPORTED_LANGUAGES[0];
    setCurrentLanguage(matchedLang);

    // Find or reconstruct scenario
    const matchedPreset = PRESET_SCENARIOS.find((s) => s.id === session.scenarioId);
    if (matchedPreset) {
      setSelectedScenario(matchedPreset);
    } else {
      setSelectedScenario({
        id: session.scenarioId,
        title: session.scenarioTitle,
        targetLanguage: session.targetLanguage,
        cefrLevel: session.cefrLevel,
        topicDomain: 'Custom Practice',
        context: session.context,
        learnerRole: session.learnerRole,
        aiPersona: session.aiPersona,
        starterMessage: session.messages[0]?.text || '',
        starterTranslation: session.messages[0]?.translation || '',
        targetLearningObjectives: [],
        keyNativeExpressions: [],
        recommendedDiscourseMarkers: [],
      });
    }

    setMessages(session.messages);
    setSessionSummary(session.summary || null);
  };

  // View summary from history modal
  const handleViewSummaryFromHistory = (summary: SessionSummary, session: SavedSession) => {
    setSessionSummary(summary);
    // Ensure scenario context is preserved for the modal display
    const matchedPreset = PRESET_SCENARIOS.find((s) => s.id === session.scenarioId);
    if (matchedPreset) {
      setSelectedScenario(matchedPreset);
    }
    setIsSummaryModalOpen(true);
  };

  const handleRestartNewScenario = () => {
    setIsSummaryModalOpen(false);
    setCurrentView('hub');
    setIsPracticeSetupOpen(true);
  };

  // Immediate Launch Handler: Generates tailored questions & auto-starts session
  const handleLaunchImmediateSession = async (booking: PracticeSessionBooking, updateUrl = true) => {
    if (updateUrl) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('topic', booking.topic);
        url.searchParams.set('numQuestions', String(booking.aiConfig.numQuestions));
        url.searchParams.set('difficulty', booking.aiConfig.difficulty.toLowerCase());
        url.searchParams.set('autoStart', 'true');
        window.history.pushState({}, '', url.toString());
      } catch (e) {
        console.warn('Could not update history state:', e);
      }
    }

    setIsGeneratingQuestions(true);

    try {
      const res = await fetch('/api/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: booking.topic,
          difficulty: booking.aiConfig.difficulty,
          numQuestions: booking.aiConfig.numQuestions,
          categories: booking.categories,
          jobRole: booking.jobRole,
          jobResponsibilities: booking.jobResponsibilities,
          targetLanguage: currentLanguage.name,
          enableFollowUps: booking.aiConfig.enableFollowUps,
          adaptiveDifficulty: booking.aiConfig.adaptiveDifficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const firstQ = data.questions && data.questions[0] ? data.questions[0].questionText : '';
        const starter = data.starterMessage
          ? `${data.starterMessage}\n\n**Question 1:** ${firstQ}`
          : `Hello! Welcome to your ${booking.topic} technical mock interview. Let's begin with Question 1:\n\n${firstQ}`;

        const newScenario: ConversationScenario = {
          id: `mock-session-${Date.now()}`,
          title: data.scenarioTitle || `${booking.topic} Technical Mock Interview (${booking.aiConfig.difficulty})`,
          targetLanguage: currentLanguage.name,
          cefrLevel: currentCefr,
          topicDomain: booking.topic,
          context: data.scenarioContext || `Target Role: ${booking.jobRole || 'Senior Engineer'}. Real-world technical evaluation.`,
          learnerRole: booking.jobRole || 'Senior Engineering Candidate',
          aiPersona: {
            name: data.interviewerName || 'Alex Vance',
            role: data.interviewerRole || 'Staff Technical Architect',
            tone: 'Insightful, Inquisitive, Constructive',
            preferredVoice: 'Fenrir',
            dialectAccent: 'Standard Native',
          },
          starterMessage: starter,
          starterTranslation: starter,
          targetLearningObjectives: [
            'Demonstrate clear architectural mastery and trade-off analysis',
            'Communicate structured problem solving under real-time constraints',
            'Answer with deep technical precision and production experience',
          ],
          keyNativeExpressions: [],
          recommendedDiscourseMarkers: ['To optimize for latency', 'The key architectural trade-off', 'In high-scale production'],
        };

        setSelectedScenario(newScenario);
        setCurrentView('room');

        // If Anti-Cheat proctoring is enabled in setup, activate camera and proctoring
        if (booking.aiConfig.antiCheatProctoring) {
          proctoring.startCameraStream().catch((err) => {
            console.warn('Could not auto-start camera for proctoring:', err);
          });
        }

        setActiveHubTab('hub');
        setSessionNotification(`🚀 Launched ${booking.topic} session! Question 1 is ready.`);
        setTimeout(() => setSessionNotification(null), 5000);
      }
    } catch (err) {
      console.error('Error generating tailored interview:', err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Schedule Handler: saves to upcoming sessions and updates coin balance
  const handleBookingScheduled = (booking: PracticeSessionBooking) => {
    setUpcomingBookings(getUpcomingBookings());
    setWalletBalance(getWalletBalance());
    setActiveHubTab('upcoming');
    setSessionNotification(`📅 Session booked for ${booking.scheduledDate || 'soon'}! Calendar invite (.ics) downloaded.`);
    setTimeout(() => setSessionNotification(null), 6000);
  };

  // Cancel & Refund Handler
  const handleCancelBooking = (bookingId: string) => {
    const { updatedBookings, refundedCoins } = cancelBooking(bookingId);
    setUpcomingBookings(updatedBookings);
    setWalletBalance(getWalletBalance());
    setSessionNotification(`Session cancelled. 🪙 ${refundedCoins} Coins refunded to your wallet.`);
    setTimeout(() => setSessionNotification(null), 5000);
  };

  // Check URL params on initial mount for auto-launch
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const autoStart = searchParams.get('autoStart');
    const topic = searchParams.get('topic');

    if (autoStart === 'true' && topic) {
      const stored = sessionStorage.getItem('pending_interview_config');
      if (stored) {
        try {
          const booking = JSON.parse(stored);
          handleLaunchImmediateSession(booking, false);
        } catch (e) {
          console.warn('Could not parse pending config:', e);
        }
      }
    }
  }, []);

  // 1-Click Quick Start for Curated Tracks
  const handleQuickStartTopic = (topicName: string, role?: string, stack?: string) => {
    const quickBooking: PracticeSessionBooking = {
      id: `booking-${Date.now()}`,
      mode: 'ai',
      topic: topicName,
      jobRole: role || 'Staff / Senior Engineer',
      jobResponsibilities: `Production engineering, system design, and performance optimizations for ${topicName}. Modern stack: ${stack || 'Production Cloud Services'}.`,
      categories: ['system_design', 'conceptual', 'coding'],
      isForNow: true,
      aiConfig: {
        difficulty: 'Medium',
        numQuestions: 5,
        timePerQuestion: 'none',
        interactiveVoiceMode: true,
        instantAiFeedback: true,
        antiCheatProctoring: false,
        antiCheatBadges: {
          gaze: false,
          phone: false,
          multipleVoices: false,
          multiFace: false,
        },
        enableFollowUps: true,
        adaptiveDifficulty: true,
      },
      aiProcessingFee: 50,
      platformFee: 0,
      totalCoins: 50,
      status: 'upcoming',
      createdAt: Date.now(),
    };
    handleLaunchImmediateSession(quickBooking);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* App Header */}
      <Header
        currentLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
        currentCefr={currentCefr}
        onSelectCefr={setCurrentCefr}
        onOpenScenarios={() => setIsScenarioModalOpen(true)}
        onOpenVocabulary={() => setIsVocabularyOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenProctoring={() => {
          setWizardInitialStep(1);
          setIsProctoringWizardOpen(true);
        }}
        onOpenEyeGazeLab={() => setIsEyeGazeLabOpen(true)}
        isProctoringActive={proctoring.isProctoringActive}
        integrityScore={proctoring.integrityScore}
        onEndSession={handleEndAndEvaluateSession}
        isLiveConnected={isLiveConnected}
        hasActiveSession={Boolean(selectedScenario)}
        messageCount={messages.length}
        savedSessionCount={savedSessionCount}
        walletBalance={walletBalance}
        onOpenPracticeSetup={() => setIsPracticeSetupOpen(true)}
        currentView={currentView}
        onSelectView={setCurrentView}
      />

      {/* Transient Session / Booking Notification Banner */}
      {sessionNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 w-full animate-fadeIn">
          <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center justify-between shadow-md">
            <span>{sessionNotification}</span>
            <button
              onClick={() => setSessionNotification(null)}
              className="text-teal-400 hover:text-teal-200 text-xs font-bold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Floating AI Proctoring & Telemetry HUD (Active during Live Mock Interview) */}
      {currentView === 'room' && proctoring.isProctoringActive && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-1 w-full">
          <ProctoringHUD
            isProctoringActive={proctoring.isProctoringActive}
            integrityScore={proctoring.integrityScore}
            strikeCount={proctoring.strikeCount}
            maxStrikes={proctoring.maxStrikes}
            gazeVector={proctoring.gazeVector}
            gazeOnScreenPercent={proctoring.gazeOnScreenPercent}
            dualAudioMetrics={proctoring.dualAudioMetrics}
            isScreenSharingActive={proctoring.isScreenSharingActive}
            displaySurface={proctoring.displaySurface}
            isFullscreen={proctoring.isFullscreen}
            incidents={proctoring.incidents}
            resumeProfile={proctoring.resumeProfile}
            idVerification={proctoring.idVerification}
            gazeCalibration={proctoring.gazeCalibration}
            cameraStream={proctoring.cameraStream}
            onEvaluateGazeFrame={proctoring.evaluateGazeFrame}
            onRequestFullscreen={proctoring.requestFullscreen}
            onOpenEyeGazeLab={() => setIsEyeGazeLabOpen(true)}
          />
        </div>
      )}

      {/* Main Cockpit Area: Hub (Screen 0) vs Live Voice Room */}
      <main className="flex-1 w-full overflow-x-hidden">
        {currentView === 'hub' ? (
          <InterviewHubPage
            walletBalance={walletBalance}
            upcomingBookings={upcomingBookings}
            onStartNewPractice={() => setIsPracticeSetupOpen(true)}
            onSelectTopicQuickStart={(topicName, role, stack) => {
              setIsPracticeSetupOpen(true);
            }}
            onQuickStartTrack={handleQuickStartTopic}
            onLaunchScheduledSession={(booking) => {
              handleLaunchImmediateSession(booking);
            }}
            onCancelBooking={handleCancelBooking}
            onOpenHistory={() => setIsHistoryOpen(true)}
            savedSessionCount={savedSessionCount}
          />
        ) : (
          <LiveVoiceRoom
            scenario={selectedScenario}
            currentLanguage={currentLanguage}
            onOpenVocabulary={() => setIsVocabularyOpen(true)}
            onOpenAssessment={handleEndAndEvaluateSession}
            onSelectAnotherScenario={() => setIsScenarioModalOpen(true)}
            onOpenProctoring={() => {
              setWizardInitialStep(1);
              setIsProctoringWizardOpen(true);
            }}
            onOpenEyeGazeLab={() => setIsEyeGazeLabOpen(true)}
            isProctoringActive={proctoring.isProctoringActive}
            resumeProfile={proctoring.resumeProfile}
            messages={messages}
            setMessages={setMessages}
            isLiveConnected={isLiveConnected}
            setIsLiveConnected={setIsLiveConnected}
            onBackToHub={() => setCurrentView('hub')}
          />
        )}
      </main>

      {/* Screen 1-5: Interactive Multi-Step Practice Setup Dialog */}
      <PracticeSetupDialog
        isOpen={isPracticeSetupOpen}
        onClose={() => setIsPracticeSetupOpen(false)}
        onLaunchImmediate={(booking) => handleLaunchImmediateSession(booking)}
        onBookingScheduled={handleBookingScheduled}
        walletBalance={walletBalance}
        onWalletUpdated={(bal) => setWalletBalance(bal)}
      />

      {/* Loading Overlay during Question Generation */}
      {isGeneratingQuestions && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100 mb-1">
              Curating Tailored Technical Interview Questions...
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Configuring real-world production engineering questions, latency tradeoffs, STAR behavioral scenarios, and activating voice synthesis.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Eye-Gaze Testing Lab & Diagnostic Sandbox Modal */}
      {isEyeGazeLabOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <EyeGazeTestingLab
            cameraStream={proctoring.cameraStream}
            onStartCamera={proctoring.startCameraStream}
            onClose={() => setIsEyeGazeLabOpen(false)}
            onSaveCalibration={(cal) => {
              proctoring.setGazeCalibration(cal);
              setIsEyeGazeLabOpen(false);
            }}
          />
        </div>
      )}

      {/* Enterprise AI Proctoring Pre-Interview Onboarding Wizard */}
      <ProctoringSetupWizard
        isOpen={isProctoringWizardOpen}
        initialStep={wizardInitialStep}
        onClose={() => setIsProctoringWizardOpen(false)}
        onComplete={(data) => {
          console.log('Proctoring Onboarding complete:', data);
        }}
        resumeProfile={proctoring.resumeProfile}
        setResumeProfile={proctoring.setResumeProfile}
        idVerification={proctoring.idVerification}
        setIdVerification={proctoring.setIdVerification}
        gazeCalibration={proctoring.gazeCalibration}
        setGazeCalibration={proctoring.setGazeCalibration}
        cameraStream={proctoring.cameraStream}
        onStartCamera={proctoring.startCameraStream}
        screenStream={proctoring.screenStream}
        onStartScreenSharing={proctoring.startScreenSharing}
        isScreenSharingActive={proctoring.isScreenSharingActive}
        displaySurface={proctoring.displaySurface}
        isFullscreen={proctoring.isFullscreen}
        onRequestFullscreen={proctoring.requestFullscreen}
        dualAudioMetrics={proctoring.dualAudioMetrics}
      />

      {/* Fullscreen & Anti-Cheat Lockout Overlay */}
      {proctoring.isFullscreenLockoutActive && (
        <FullscreenLockoutOverlay
          reason={proctoring.lockoutReason}
          incidentType={proctoring.lockoutIncidentType}
          strikeCount={proctoring.strikeCount}
          maxStrikes={proctoring.maxStrikes}
          onResolve={proctoring.resolveLockout}
        />
      )}

      {/* Scenario Selection Modal */}
      {isScenarioModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl">
            <ScenarioSelector
              currentLanguage={currentLanguage}
              currentCefr={currentCefr}
              selectedScenario={selectedScenario}
              onSelectScenario={(sc) => {
                setSelectedScenario(sc);
                setIsScenarioModalOpen(false);
              }}
              onClose={() => setIsScenarioModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Vocabulary Drawer */}
      <VocabularyDrawer
        isOpen={isVocabularyOpen}
        onClose={() => setIsVocabularyOpen(false)}
        scenario={selectedScenario}
        targetLanguage={currentLanguage.name}
      />

      {/* Past Sessions & Transcripts History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setSavedSessionCount(getSavedSessions().length);
        }}
        onResumeSession={handleResumePastSession}
        onViewSummary={handleViewSummaryFromHistory}
      />

      {/* Session Summary Modal */}
      {isSummaryModalOpen && (
        <SessionSummaryModal
          summary={sessionSummary}
          scenario={selectedScenario}
          messages={messages}
          onClose={() => setIsSummaryModalOpen(false)}
          onRestart={handleRestartNewScenario}
        />
      )}

      {/* Loading Overlay during Oral Evaluation */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 animate-spin">
            <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100 mb-1">
              Evaluating Oral Dialogue & CEFR Dimensions...
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Analyzing grammatical accuracy, lexical sophistication, native idioms, and discourse cadence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
