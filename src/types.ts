export type CEFRLevel = 'B2 Upper Intermediate' | 'C1 Advanced' | 'C2 Mastery / Native Nuance';

export type OverallRating = 'Excellent' | 'Strong' | 'Good' | 'Average' | 'Weak' | 'Poor';

export type HiringRecommendation = 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';

export interface RecruiterDimension {
  name: string;
  score: number; // 0-100
  label: string; // e.g. "Accurate", "Concise", "Advanced-Level", "Strong Examples", "Structured Approach"
  status: 'strength' | 'satisfactory' | 'needs_work';
  feedback: string;
}

export interface RecruiterDimensionBreakdown {
  contentQuality: RecruiterDimension;
  clarityAndCommunication: RecruiterDimension;
  depthOfKnowledge: RecruiterDimension;
  examplesAndEvidence: RecruiterDimension;
  problemSolving: RecruiterDimension;
}

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  defaultDialects: string[];
}

export interface NativeExpression {
  phrase: string;
  phoneticOrPinyin?: string;
  literalMeaning: string;
  contextualUsage: string;
  cefrRating?: string;
}

export interface ScenarioPersona {
  name: string;
  role: string;
  tone: string;
  preferredVoice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  dialectAccent: string;
  avatarSeed?: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  targetLanguage: string;
  cefrLevel: CEFRLevel;
  topicDomain: string;
  context: string;
  learnerRole: string;
  aiPersona: ScenarioPersona;
  starterMessage: string;
  starterTranslation: string;
  targetLearningObjectives: string[];
  keyNativeExpressions: NativeExpression[];
  recommendedDiscourseMarkers: string[];
}

export interface TurnFeedback {
  score: number; // 1-100
  rating: OverallRating; // Excellent | Strong | Good | Average | Weak | Poor
  tags: string[]; // Combined key tags e.g. ["Clear", "Relevant", "Vague", "Missing Example"]
  positiveTags: string[]; // e.g. ["Precise", "Structured", "Insightful"]
  improvementTags: string[]; // e.g. ["Vague", "Missing Example", "Lacks Depth"]
  strengths: string[]; // Concrete things done well
  improvements: string[]; // Specific, actionable interviewer feedback
  dimensions: RecruiterDimensionBreakdown;
  idealAnswerElevated?: string; // High-impact interview-ready version
  // Linguistic & CEFR metrics
  fluencyScore?: number;
  naturalnessScore?: number;
  detectedCefrLevel?: string;
  positiveAspects?: string[];
  nativeRefinements?: Array<{
    originalPart: string;
    nativeAlternative: string;
    explanation: string;
  }>;
  grammarAndCollocations?: Array<{
    issue: string;
    correction: string;
    ruleNuance: string;
  }>;
  suggestedNextPhrases?: string[];
  phoneticOrPronunciationNotes?: string;
}

export interface DialogueMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  translation?: string;
  timestamp: number;
  audioBase64?: string | null;
  feedback?: TurnFeedback;
  nativeExpressionsUsed?: Array<{
    phrase: string;
    meaning: string;
  }>;
  isStreaming?: boolean;
}

export interface DimensionScores {
  contentQuality: number;
  clarityAndCommunication: number;
  depthOfKnowledge: number;
  examplesAndEvidence: number;
  problemSolving: number;
  fluencyAndCoherence?: number;
  lexicalSophistication?: number;
  grammaticalRangeAndAccuracy?: number;
  pragmaticAndIdiomaticNuance?: number;
  interactionAndTurnTaking?: number;
}

export interface SessionSummary {
  overallScore: number;
  overallRating: OverallRating;
  rating: OverallRating;
  hiringRecommendation?: HiringRecommendation;
  cefrAttained: string;
  overallTags: string[];
  positiveTags: string[];
  improvementTags: string[];
  keyStrengths: string[];
  priorityImprovements: string[];
  dimensionScores: DimensionScores;
  dimensionBreakdown: RecruiterDimensionBreakdown;
  executiveSummary: string;
  masteredNativeExpressions: Array<{
    phrase: string;
    meaning: string;
    exampleInContext: string;
  }>;
  highValueVocabularyRecommendations: Array<{
    wordOrPhrase: string;
    translation: string;
    whyItElevates: string;
  }>;
  keyGrammarAndNuanceTakeaways?: string[];
  personalizedPracticeRecommendations: string[];
  // Proctoring & Integrity Audit
  proctoringAudit?: {
    integrityScore: number;
    overallIntegrityRating: 'Clean / High Integrity' | 'Minor Discrepancies' | 'Questionable' | 'Integrity Breach';
    strikesTotal: number;
    gazeCompliancePercent: number;
    windowBlurCount: number;
    fullscreenExitCount: number;
    whisperIncidentCount: number;
    systemAudioLeakCount: number;
    idVerified: boolean;
    idCardType?: string;
    candidateName?: string;
    incidents: ProctoringIncident[];
  };
}

// Enterprise Proctoring Types
export interface CandidateResumeProfile {
  fileName: string;
  candidateName: string;
  headline: string;
  yearsExperience: string | number;
  skills: string[];
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    period?: string;
    details: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year?: string;
  }>;
  tailoredQuestions?: string[];
  rawText?: string;
  uploadedAt: number;
}

export interface GovernmentIdVerification {
  verified: boolean;
  status: 'VERIFIED' | 'SUSPICIOUS' | 'RETAKE_NEEDED';
  confidenceScore: number;
  faceDetected: boolean;
  faceCentered?: boolean;
  idCardDetected: boolean;
  idCardType: string;
  extractedNameFromId: string;
  nameMatchScore: number;
  capturedPhotoBase64: string;
  capturedAt: number;
  auditNotes: string[];
}

export interface GazePointCoord {
  x: number;
  y: number;
}

export interface GazeCalibrationData {
  isCalibrated: boolean;
  calibratedAt: number;
  pointsCalibrated: number;
  precisionScore: number;
  boundaryCoordinates: {
    center: GazePointCoord;
    topLeft: GazePointCoord;
    topRight: GazePointCoord;
    bottomLeft: GazePointCoord;
    bottomRight: GazePointCoord;
  };
}

export type ProctoringViolationType =
  | 'WINDOW_BLUR'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'SCREEN_SHARE_STOPPED'
  | 'GAZE_OFF_SCREEN'
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_FACES'
  | 'WHISPER_DETECTED'
  | 'SYSTEM_AUDIO_DETECTED'
  | 'MANUAL_FLAG';

export interface ProctoringIncident {
  id: string;
  timestamp: number;
  type: ProctoringViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  durationSeconds?: number;
  snapshotBase64?: string;
}

export interface DualAudioMetrics {
  micRms: number;
  micPeak: number;
  whisperBandEnergy: number;
  systemAudioRms: number;
  systemAudioPeak: number;
  systemAudioActive: boolean;
  whisperDetected: boolean;
}

export type GazeDirection = 'CENTER' | 'LEFT_MONITOR' | 'RIGHT_MONITOR' | 'DOWN_PHONE' | 'UP' | 'AWAY';

export interface ProctoringSessionState {
  isProctoringActive: boolean;
  resumeProfile: CandidateResumeProfile | null;
  idVerification: GovernmentIdVerification | null;
  gazeCalibration: GazeCalibrationData | null;
  isScreenSharingActive: boolean;
  displaySurface: 'monitor' | 'window' | 'browser' | 'none';
  isFullscreen: boolean;
  strikeCount: number;
  maxStrikes: number;
  integrityScore: number;
  incidents: ProctoringIncident[];
  gazeVector: GazeDirection;
  gazeOnScreenPercent: number;
  dualAudioMetrics: DualAudioMetrics;
}

export type ConversationMode = 'live' | 'studio';

export interface SavedSession {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  targetLanguage: string;
  cefrLevel: CEFRLevel;
  learnerRole: string;
  aiPersona: ScenarioPersona;
  context: string;
  startedAt: number;
  updatedAt: number;
  messages: DialogueMessage[];
  summary?: SessionSummary | null;
  mode?: ConversationMode;
  notes?: string;
  proctoringData?: {
    resumeProfile?: CandidateResumeProfile | null;
    idVerification?: GovernmentIdVerification | null;
    integrityScore?: number;
    strikesTotal?: number;
    incidentCount?: number;
  };
}

// --- INTERVIEW PREPARATION & SETUP FLOW TYPES ---

export type PracticeMode = 'ai' | 'experts' | 'friends';

export type PracticeDialogStep =
  | 'selectType'
  | 'selectTopics'
  | 'aiSetupAdvanced'
  | 'aiSetupCategories'
  | 'selectTimeSlot';

export type QuestionCategory =
  | 'conceptual'
  | 'coding'
  | 'system_design'
  | 'behavioral';

export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export type InterviewTimeLimit = 'none' | '1m' | '2m' | '5m';

export interface AISetupConfig {
  numQuestions: number;
  difficulty: InterviewDifficulty;
  timePerQuestion: InterviewTimeLimit;
  interactiveVoiceMode: boolean;
  instantAiFeedback: boolean;
  antiCheatProctoring: boolean;
  antiCheatBadges: {
    gaze: boolean;
    phone: boolean;
    multipleVoices: boolean;
    multiFace: boolean;
  };
  enableFollowUps: boolean;
  adaptiveDifficulty: boolean;
}

export interface PracticeSessionBooking {
  id: string;
  mode: PracticeMode;
  topic: string;
  topicIcon?: string;
  categories: QuestionCategory[];
  aiConfig: AISetupConfig;
  isForNow: boolean;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  scheduledTimestamp?: number;
  jobRole?: string;
  jobResponsibilities?: string;
  aiProcessingFee: number;
  platformFee: number;
  totalCoins: number;
  createdAt: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  friendEmail?: string;
  expertName?: string;
}

export interface GeneratedInterviewQuestion {
  id: string;
  questionNumber: number;
  category: QuestionCategory;
  categoryLabel: string;
  questionText: string;
  contextOrScenario?: string;
  hints?: string[];
  expectedKeyPoints?: string[];
  suggestedDurationSeconds: number;
}

