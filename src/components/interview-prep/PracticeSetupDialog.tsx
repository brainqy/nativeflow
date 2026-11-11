import React, { useState } from 'react';
import {
  X,
  Bot,
  UserCheck,
  Users,
  Coins,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  ShieldCheck,
  Eye,
  Smartphone,
  Mic,
  Sliders,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  Volume2,
  Rocket,
  Calendar,
} from 'lucide-react';
import {
  PracticeMode,
  PracticeDialogStep,
  QuestionCategory,
  InterviewDifficulty,
  InterviewTimeLimit,
  AISetupConfig,
  PracticeSessionBooking,
} from '../../types';
import { PracticeTopicSelection, PracticeCategorySelection, PRESET_TOPICS } from './PracticeTopicSelection';
import { PracticeDateTimeSelector } from './PracticeDateTimeSelector';
import { getWalletBalance, updateWalletBalance, saveBooking } from '../../utils/bookingStorage';
import { generateIcsCalendarFile, downloadIcsFile } from '../../utils/calendarUtils';

interface PracticeSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchImmediate: (booking: PracticeSessionBooking) => void;
  onBookingScheduled: (booking: PracticeSessionBooking) => void;
  initialStep?: PracticeDialogStep;
  walletBalance?: number;
  onWalletUpdated?: (newBalance: number) => void;
}

export const PracticeSetupDialog: React.FC<PracticeSetupDialogProps> = ({
  isOpen,
  onClose,
  onLaunchImmediate,
  onBookingScheduled,
  initialStep = 'selectType',
  walletBalance = 450,
  onWalletUpdated,
}) => {
  // Navigation step state
  const [dialogStep, setDialogStep] = useState<PracticeDialogStep>(initialStep);

  // Step 1: Mode
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('ai');

  // Friends & Experts additional state
  const [friendEmail, setFriendEmail] = useState('');
  const [selectedExpert, setSelectedExpert] = useState('Alex Vance (Staff Distributed Architect @ Stripe)');

  // Step 2: Topic
  const [selectedTopic, setSelectedTopic] = useState<string>('Java Backend');

  // Step 3: AI Advanced Configuration
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
  const [timePerQuestion, setTimePerQuestion] = useState<InterviewTimeLimit>('2m');
  const [interactiveVoiceMode, setInteractiveVoiceMode] = useState<boolean>(true);
  const [instantAiFeedback, setInstantAiFeedback] = useState<boolean>(true);
  const [antiCheatProctoring, setAntiCheatProctoring] = useState<boolean>(false);
  const [antiCheatBadges, setAntiCheatBadges] = useState({
    gaze: true,
    phone: true,
    multipleVoices: true,
    multiFace: true,
  });
  const [enableFollowUps, setEnableFollowUps] = useState<boolean>(true);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<boolean>(false);

  // Step 4: Categories
  const [selectedCategories, setSelectedCategories] = useState<QuestionCategory[]>([
    'conceptual',
    'coding',
    'system_design',
  ]);

  // Step 5: Scheduling & Context
  const [isForNow, setIsForNow] = useState<boolean>(true);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState<string>(tomorrow);
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [jobRole, setJobRole] = useState<string>('Senior Backend Engineer @ Stripe');
  const [jobResponsibilities, setJobResponsibilities] = useState<string>(
    'High-throughput payment microservices, Spring Boot, DynamoDB, Kafka, latency SLAs'
  );

  if (!isOpen) return null;

  // Cost calculation
  const totalCost = practiceMode === 'ai' ? 50 : practiceMode === 'experts' ? 299 : 0;

  // Handler for topic selection
  const handleSelectTopic = (topicName: string, defaultRole?: string, defaultStack?: string) => {
    setSelectedTopic(topicName);
    if (defaultRole) setJobRole(defaultRole);
    if (defaultStack) setJobResponsibilities(defaultStack);
  };

  // Handler for category toggle
  const handleToggleCategory = (cat: QuestionCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Step progression logic
  const handleNextStep = () => {
    if (dialogStep === 'selectType') {
      if (practiceMode === 'ai') {
        setDialogStep('selectTopics');
      } else if (practiceMode === 'experts' || practiceMode === 'friends') {
        setDialogStep('selectTopics');
      }
    } else if (dialogStep === 'selectTopics') {
      if (practiceMode === 'ai') {
        setDialogStep('aiSetupAdvanced');
      } else {
        setDialogStep('selectTimeSlot');
      }
    } else if (dialogStep === 'aiSetupAdvanced') {
      setDialogStep('aiSetupCategories');
    } else if (dialogStep === 'aiSetupCategories') {
      setDialogStep('selectTimeSlot');
    }
  };

  const handlePrevStep = () => {
    if (dialogStep === 'selectTopics') {
      setDialogStep('selectType');
    } else if (dialogStep === 'aiSetupAdvanced') {
      setDialogStep('selectTopics');
    } else if (dialogStep === 'aiSetupCategories') {
      setDialogStep('aiSetupAdvanced');
    } else if (dialogStep === 'selectTimeSlot') {
      if (practiceMode === 'ai') {
        setDialogStep('aiSetupCategories');
      } else {
        setDialogStep('selectTopics');
      }
    }
  };

  // Final Action: Launch or Schedule
  const handleFinalSubmit = () => {
    const aiConfig: AISetupConfig = {
      numQuestions,
      difficulty,
      timePerQuestion,
      interactiveVoiceMode,
      instantAiFeedback,
      antiCheatProctoring,
      antiCheatBadges,
      enableFollowUps,
      adaptiveDifficulty,
    };

    const platformFee = Math.round(totalCost * 0.16);
    const aiProcessingFee = totalCost - platformFee;

    const scheduledTimestamp = isForNow
      ? Date.now()
      : new Date(`${scheduledDate}T${scheduledTime}:00`).getTime();

    const booking: PracticeSessionBooking = {
      id: `booking-${Date.now()}`,
      mode: practiceMode,
      topic: selectedTopic,
      categories: selectedCategories,
      aiConfig,
      isForNow,
      scheduledDate: isForNow ? undefined : scheduledDate,
      scheduledTime: isForNow ? undefined : scheduledTime,
      scheduledTimestamp,
      jobRole: jobRole.trim(),
      jobResponsibilities: jobResponsibilities.trim(),
      aiProcessingFee,
      platformFee,
      totalCoins: totalCost,
      createdAt: Date.now(),
      status: 'upcoming',
      friendEmail: practiceMode === 'friends' ? friendEmail : undefined,
      expertName: practiceMode === 'experts' ? selectedExpert : undefined,
    };

    // Deduct coins from wallet balance
    if (totalCost > 0) {
      const newBal = updateWalletBalance(-totalCost);
      if (onWalletUpdated) onWalletUpdated(newBal);
    }

    if (isForNow) {
      // Immediate Execution
      // Save pending job description into sessionStorage as requested
      const jobDesc = `${jobRole}\n${jobResponsibilities}`;
      try {
        sessionStorage.setItem('pending_job_description', jobDesc);
        sessionStorage.setItem('pending_interview_config', JSON.stringify(booking));
      } catch (e) {
        console.warn('Could not store to sessionStorage:', e);
      }

      onLaunchImmediate(booking);
      onClose();
    } else {
      // Scheduled for Later
      saveBooking(booking);
      onBookingScheduled(booking);

      // Offer automatic ICS download
      try {
        const icsContent = generateIcsCalendarFile({
          title: `AI Mock Interview: ${selectedTopic} (${difficulty})`,
          description: `Target Role: ${jobRole}\nTopics: ${selectedCategories.join(', ')}\nQuestions: ${numQuestions}\nMode: Practice with AI`,
          scheduledTimestamp,
          durationMinutes: numQuestions * (timePerQuestion === '5m' ? 5 : timePerQuestion === '1m' ? 2 : 3) + 15,
        });
        downloadIcsFile(`Interview-${selectedTopic.replace(/\s+/g, '_')}`, icsContent);
      } catch (e) {
        console.error('ICS generation error:', e);
      }

      onClose();
    }
  };

  // Step Header Information
  const stepTitles: Record<PracticeDialogStep, { title: string; subtitle: string; stepNumber: number }> = {
    selectType: {
      title: 'Schedule New Practice Session',
      subtitle: 'Choose the type of mock interview you want to practice.',
      stepNumber: 1,
    },
    selectTopics: {
      title: 'Schedule New Practice Session',
      subtitle: `Select the primary topic for your ${practiceMode === 'ai' ? 'AI' : 'expert'} interview.`,
      stepNumber: 2,
    },
    aiSetupAdvanced: {
      title: 'Schedule New Practice Session',
      subtitle: 'Configure your AI-powered mock interview parameters and integrity checks.',
      stepNumber: 3,
    },
    aiSetupCategories: {
      title: 'Schedule New Practice Session',
      subtitle: `Choose the types of questions for your ${selectedTopic} session.`,
      stepNumber: 4,
    },
    selectTimeSlot: {
      title: 'Schedule New Practice Session',
      subtitle: 'Pick a date, time, and provide job context.',
      stepNumber: 5,
    },
  };

  const currentStepInfo = stepTitles[dialogStep];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-[11px] font-bold border border-teal-500/20">
                Step {currentStepInfo.stepNumber} of 5
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {currentStepInfo.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentStepInfo.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Track */}
        <div className="h-1 bg-slate-800 w-full flex">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${(currentStepInfo.stepNumber / 5) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* SCREEN 1: STEP 1 - SELECT PRACTICE MODE */}
          {dialogStep === 'selectType' && (
            <div className="space-y-3.5">
              {/* Option 1: Practice with AI */}
              <div
                onClick={() => setPracticeMode('ai')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                  practiceMode === 'ai'
                    ? 'bg-teal-500/15 border-teal-500/60 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xl shrink-0">
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-slate-100">
                        Practice with AI
                      </h3>
                      {practiceMode === 'ai' && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Get instant voice-driven evaluation and real-time feedback.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <span>🪙 50 Coins per session</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-normal">Available 24/7 with instant launch</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Practice with Experts */}
              <div
                onClick={() => setPracticeMode('experts')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                  practiceMode === 'experts'
                    ? 'bg-teal-500/15 border-teal-500/60 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shrink-0">
                    👨‍💼
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-slate-100">
                        Practice with Experts
                      </h3>
                      {practiceMode === 'experts' && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Schedule a 1-on-1 session with a vetted industry specialist.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <span>🪙 299 Coins (Held in Escrow)</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-normal">FAANG/Tier-1 Engineers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 3: Practice with Friends */}
              <div
                onClick={() => setPracticeMode('friends')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                  practiceMode === 'friends'
                    ? 'bg-teal-500/15 border-teal-500/60 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl shrink-0">
                    👥
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-slate-100">
                        Practice with Friends
                      </h3>
                      {practiceMode === 'friends' && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Invite a peer to conduct a mutual mock interview.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <span>Free • Requires Friend's Email Address</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: STEP 2 - TOPIC SELECTION */}
          {dialogStep === 'selectTopics' && (
            <PracticeTopicSelection
              selectedTopic={selectedTopic}
              onSelectTopic={handleSelectTopic}
            />
          )}

          {/* SCREEN 3: STEP 3 - AI ADVANCED CONFIGURATION */}
          {dialogStep === 'aiSetupAdvanced' && (
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {/* Question Count & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Number of Questions:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                      className="w-24 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-400"
                    />
                    <span className="text-xs text-slate-400">(1 - 50 questions)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Difficulty Level:
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                  >
                    <option value="Easy">Easy (Fundamentals & Core syntax)</option>
                    <option value="Medium">Medium (Production standards & Patterns)</option>
                    <option value="Hard">Hard (Staff / Architect Bar Raiser)</option>
                  </select>
                </div>
              </div>

              {/* Time per Question */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Time per Question:
                </label>
                <select
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(e.target.value as InterviewTimeLimit)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  <option value="none">No Timer (Relaxed Practice)</option>
                  <option value="1m">1 minute (Rapid-Fire)</option>
                  <option value="2m">2 minutes (Standard Real-World Answer)</option>
                  <option value="5m">5 minutes (Comprehensive System Walkthrough)</option>
                </select>
              </div>

              {/* Feature Controls */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Feature Controls:
                </label>
                <div className="space-y-2 border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-900/90 overflow-hidden">
                  {/* Interactive Voice Mode */}
                  <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={interactiveVoiceMode}
                        onChange={(e) => setInteractiveVoiceMode(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 accent-teal-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            🎙️ Interactive Voice Mode
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 text-[10px] font-extrabold border border-teal-500/40">
                            ULTRA-REALISTIC
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enables voice recognition and natural AI speech synthesis.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Instant AI Feedback */}
                  <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={instantAiFeedback}
                        onChange={(e) => setInstantAiFeedback(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 accent-teal-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-100">
                          ⚡ Instant AI Feedback
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Receive critique & score immediately after each question.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Anti-Cheat & AI Proctoring */}
                  <div className="p-3.5 flex flex-col gap-2 hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={antiCheatProctoring}
                        onChange={(e) => setAntiCheatProctoring(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 accent-teal-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            🛡️ Anti-Cheat & AI Proctoring
                          </span>
                          {antiCheatProctoring && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              Active Integrity
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Monitors video feed for eye gaze, multiple faces, voices, and phones.
                        </p>

                        {/* Proctoring Badges */}
                        {antiCheatProctoring && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setAntiCheatBadges({ ...antiCheatBadges, gaze: !antiCheatBadges.gaze })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                                antiCheatBadges.gaze
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              👁️ Gaze
                            </button>

                            <button
                              type="button"
                              onClick={() => setAntiCheatBadges({ ...antiCheatBadges, phone: !antiCheatBadges.phone })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                                antiCheatBadges.phone
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              📱 Phone Detect
                            </button>

                            <button
                              type="button"
                              onClick={() => setAntiCheatBadges({ ...antiCheatBadges, multipleVoices: !antiCheatBadges.multipleVoices })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                                antiCheatBadges.multipleVoices
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              🎙️ Multiple Voices
                            </button>

                            <button
                              type="button"
                              onClick={() => setAntiCheatBadges({ ...antiCheatBadges, multiFace: !antiCheatBadges.multiFace })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                                antiCheatBadges.multiFace
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              👥 Multi-Face
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enable Follow-up Questions */}
                  <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={enableFollowUps}
                        onChange={(e) => setEnableFollowUps(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 accent-teal-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-100">
                          🔄 Enable Follow-up Questions
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          AI probes deeper based on nuances in your previous answer.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Adaptive Difficulty */}
                  <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={adaptiveDifficulty}
                        onChange={(e) => setAdaptiveDifficulty(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 accent-teal-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-100">
                          📈 Adaptive Difficulty
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Dynamically increases or decreases difficulty based on your answers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 4: STEP 4 - QUESTION CATEGORIES */}
          {dialogStep === 'aiSetupCategories' && (
            <PracticeCategorySelection
              selectedTopic={selectedTopic}
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
            />
          )}

          {/* SCREEN 5: STEP 5 - SCHEDULING, CONTEXT & ESCROW CONFIRMATION */}
          {dialogStep === 'selectTimeSlot' && (
            <PracticeDateTimeSelector
              practiceMode={practiceMode}
              selectedTopic={selectedTopic}
              isForNow={isForNow}
              setIsForNow={setIsForNow}
              scheduledDate={scheduledDate}
              setScheduledDate={setScheduledDate}
              scheduledTime={scheduledTime}
              setScheduledTime={setScheduledTime}
              jobRole={jobRole}
              setJobRole={setJobRole}
              jobResponsibilities={jobResponsibilities}
              setJobResponsibilities={setJobResponsibilities}
              walletBalance={walletBalance}
              totalCost={totalCost}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div>
            {dialogStep === 'selectType' ? (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          <div>
            {dialogStep !== 'selectTimeSlot' ? (
              <button
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 transition-all inline-flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/25 transition-all inline-flex items-center gap-2"
              >
                {isForNow ? (
                  <>
                    <Rocket className="w-4 h-4" /> Launch AI Session Now
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" /> Confirm & Schedule Session
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
