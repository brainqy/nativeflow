import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Send,
  RefreshCw,
  Award,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Globe2,
  Sliders,
  Flame,
  MessageSquare,
  Zap,
  Info,
  Activity,
  Download,
  Check,
} from 'lucide-react';
import {
  ConversationScenario,
  DialogueMessage,
  ConversationMode,
  TurnFeedback,
  LanguageOption,
  SavedSession,
  CandidateResumeProfile,
} from '../types';
import {
  floatTo16BitPCMBase64,
  LiveAudioPlayer,
  playSinglePcmAudio,
} from '../utils/audioUtils';
import { AudioVisualizer, VisualizerMode } from './AudioVisualizer';
import { InlineFeedbackModal } from './InlineFeedbackModal';
import { exportSessionAsMarkdown, triggerFileDownload } from '../utils/sessionStorage';
import { ShieldCheck, ShieldAlert, FileText, Eye } from 'lucide-react';

interface LiveVoiceRoomProps {
  scenario: ConversationScenario;
  currentLanguage: LanguageOption;
  onOpenVocabulary: () => void;
  onOpenAssessment: () => void;
  onSelectAnotherScenario: () => void;
  onOpenProctoring?: () => void;
  onOpenEyeGazeLab?: () => void;
  isProctoringActive?: boolean;
  resumeProfile?: CandidateResumeProfile | null;
  messages: DialogueMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DialogueMessage[]>>;
  isLiveConnected: boolean;
  setIsLiveConnected: (connected: boolean) => void;
  onBackToHub?: () => void;
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  scenario,
  currentLanguage,
  onOpenVocabulary,
  onOpenAssessment,
  onSelectAnotherScenario,
  onOpenProctoring,
  onOpenEyeGazeLab,
  isProctoringActive = false,
  resumeProfile,
  messages,
  setMessages,
  isLiveConnected,
  setIsLiveConnected,
  onBackToHub,
}) => {
  const [mode, setMode] = useState<ConversationMode>('live');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [showTranslations, setShowTranslations] = useState(false);
  const [userVisualizerMode, setUserVisualizerMode] = useState<VisualizerMode>('oscilloscope');
  const [aiVisualizerMode, setAiVisualizerMode] = useState<VisualizerMode>('orb');
  
  // Feedback state
  const [activeFeedback, setActiveFeedback] = useState<TurnFeedback | null>(null);
  const [analyzedUtterance, setAnalyzedUtterance] = useState<string>('');
  const [analyzingMessageId, setAnalyzingMessageId] = useState<string | null>(null);

  // Audio nodes & WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time audio-synced text pacing refs
  const fullAiTurnTextRef = useRef<string>('');
  const displayedAiTurnTextRef = useRef<string>('');
  const currentAiMsgIdRef = useRef<string | null>(null);
  const isTurnCompleteReceivedRef = useRef<boolean>(false);
  const currentUserTurnTextRef = useRef<string>('');

  // Live Subtitles State for HUD Banner
  const [liveAiSubtitle, setLiveAiSubtitle] = useState<string>('');
  const [liveUserSubtitle, setLiveUserSubtitle] = useState<string>('');

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessingTurn]);

  // Synchronized text pacing calculator based on audio buffer playback progress
  const getPacedText = useCallback((fullText: string, progress: number): string => {
    if (!fullText) return '';
    if (progress >= 0.98) return fullText;

    const tokens = fullText.split(/(\s+)/);
    if (tokens.length <= 1) return fullText;

    let totalWords = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].trim().length > 0) totalWords++;
    }

    // Proportional word reveal with minimum 1 word if progress > 0
    const targetWords = Math.max(1, Math.min(totalWords, Math.ceil(totalWords * progress)));

    let revealedWords = 0;
    let endTokenIndex = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].trim().length > 0) {
        revealedWords++;
      }
      endTokenIndex = i + 1;
      if (revealedWords >= targetWords) break;
    }

    return tokens.slice(0, endTokenIndex).join('');
  }, []);

  // Real-time synchronization interval: reads audio buffer position every 35ms
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!audioPlayerRef.current) return;
      const { progress, isPlaying } = audioPlayerRef.current.getPlaybackProgress();

      if (fullAiTurnTextRef.current && currentAiMsgIdRef.current) {
        // If audio is actively playing, reveal words in sync with progress
        // If audio finished or hasn't started, reveal all text received so far
        const pacedText = isPlaying
          ? getPacedText(fullAiTurnTextRef.current, Math.max(0.05, progress))
          : fullAiTurnTextRef.current;

        if (pacedText && pacedText !== displayedAiTurnTextRef.current) {
          displayedAiTurnTextRef.current = pacedText;
          setLiveAiSubtitle(pacedText);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentAiMsgIdRef.current
                ? { ...m, text: pacedText, isStreaming: isPlaying }
                : m
            )
          );
        }
      }
    }, 35);

    return () => clearInterval(syncInterval);
  }, [getPacedText, setMessages]);

  // Initialize Player
  useEffect(() => {
    const player = new LiveAudioPlayer(24000);
    audioPlayerRef.current = player;

    player.onPlaybackStateChange = (isPlaying) => {
      setIsAiSpeaking(isPlaying);

      if (!isPlaying) {
        // Audio playback completed
        if (fullAiTurnTextRef.current && currentAiMsgIdRef.current) {
          const finalText = fullAiTurnTextRef.current;
          displayedAiTurnTextRef.current = finalText;
          setLiveAiSubtitle(finalText);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentAiMsgIdRef.current
                ? { ...m, text: finalText, isStreaming: false }
                : m
            )
          );
        }

        if (isTurnCompleteReceivedRef.current) {
          fullAiTurnTextRef.current = '';
          currentAiMsgIdRef.current = null;
          isTurnCompleteReceivedRef.current = false;
          setTimeout(() => {
            setLiveAiSubtitle('');
          }, 3500);
        }
      }
    };

    return () => {
      player.close();
      cleanupMic();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [setMessages]);

  // Cleanup mic streams
  const cleanupMic = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    setIsMicActive(false);
    setIsUserSpeaking(false);
  };

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const pingIntervalRef = useRef<any>(null);

  // Setup / Teardown Live WebSocket when scenario or mode changes
  const connectLiveWebSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    console.log('Connecting to Live WebSocket:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to Gemini Live');
        setIsLiveConnected(true);
        setConnectionStatus('connected');

        // Send configuration handshake
        ws.send(
          JSON.stringify({
            type: 'init',
            targetLanguage: scenario.targetLanguage,
            personaName: scenario.aiPersona.name,
            personaRole: scenario.aiPersona.role,
            scenarioContext: scenario.context,
            voiceName: scenario.aiPersona.preferredVoice || 'Fenrir',
            dialectAccent: scenario.aiPersona.dialectAccent || 'Standard Native',
            cefrLevel: scenario.cefrLevel,
            starterMessage: scenario.starterMessage,
          })
        );

        // Ping keepalive every 15s to keep proxy alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            console.log('Live API session confirmed ready');
            setIsLiveConnected(true);
            setConnectionStatus('connected');
          } else if (msg.type === 'audio' && msg.audio) {
            setIsAiSpeaking(true);
            audioPlayerRef.current?.queueChunk(msg.audio);
          } else if (msg.type === 'outputTranscription' && msg.text) {
            // Model transcription chunk arrives from Gemini Live
            fullAiTurnTextRef.current += msg.text;

            const { progress, isPlaying } = audioPlayerRef.current?.getPlaybackProgress() || { progress: 0, isPlaying: false };
            const textToDisplay = isPlaying
              ? getPacedText(fullAiTurnTextRef.current, Math.max(0.04, progress))
              : fullAiTurnTextRef.current;

            displayedAiTurnTextRef.current = textToDisplay;
            setLiveAiSubtitle(textToDisplay);

            if (!currentAiMsgIdRef.current) {
              // If there's an existing starter placeholder message in messages, bind directly to it
              const starterMsg = messages.find((m) => m.id.startsWith('starter-') && m.role === 'model');
              const newId = starterMsg ? starterMsg.id : `ai-${Date.now()}`;
              currentAiMsgIdRef.current = newId;
              isTurnCompleteReceivedRef.current = false;

              setMessages((prev) => {
                const existingIdx = prev.findIndex((m) => m.id === newId);
                if (existingIdx !== -1) {
                  return prev.map((m, idx) =>
                    idx === existingIdx
                      ? { ...m, text: textToDisplay, isStreaming: true }
                      : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: newId,
                    role: 'model',
                    text: textToDisplay,
                    timestamp: Date.now(),
                    isStreaming: true,
                  },
                ];
              });
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAiMsgIdRef.current
                    ? { ...m, text: textToDisplay, isStreaming: true }
                    : m
                )
              );
            }
          } else if (msg.type === 'inputTranscription' && msg.text) {
            // User transcription chunk from Live API speech recognition
            currentUserTurnTextRef.current += msg.text;
            setLiveUserSubtitle(currentUserTurnTextRef.current);

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user' && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    text: currentUserTurnTextRef.current,
                  },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    text: currentUserTurnTextRef.current,
                    timestamp: Date.now(),
                    isStreaming: true,
                  },
                ];
              }
            });
          } else if (msg.type === 'interrupted') {
            // Interruption: halt audio and freeze revealed text
            console.log('Interruption received - halting AI audio');
            audioPlayerRef.current?.stopAndClear();
            setIsAiSpeaking(false);

            if (currentAiMsgIdRef.current) {
              const cutoffText = displayedAiTurnTextRef.current || fullAiTurnTextRef.current;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAiMsgIdRef.current
                    ? {
                        ...m,
                        text: cutoffText ? `${cutoffText}...` : m.text,
                        isStreaming: false,
                      }
                    : m
                )
              );
            }

            fullAiTurnTextRef.current = '';
            currentAiMsgIdRef.current = null;
            isTurnCompleteReceivedRef.current = false;
            setLiveAiSubtitle('');
          } else if (msg.type === 'turnComplete') {
            isTurnCompleteReceivedRef.current = true;
            currentUserTurnTextRef.current = '';
            setLiveUserSubtitle('');

            // Finalize any streaming user messages
            setMessages((prev) =>
              prev.map((m) => (m.role === 'user' && m.isStreaming ? { ...m, isStreaming: false } : m))
            );

            // If audio has already stopped or is not playing, finalize AI message immediately
            if (!audioPlayerRef.current?.isCurrentlyPlaying()) {
              setIsAiSpeaking(false);
              if (currentAiMsgIdRef.current && fullAiTurnTextRef.current) {
                const finalText = fullAiTurnTextRef.current;
                displayedAiTurnTextRef.current = finalText;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentAiMsgIdRef.current
                      ? { ...m, text: finalText, isStreaming: false }
                      : m
                  )
                );
              }
              fullAiTurnTextRef.current = '';
              currentAiMsgIdRef.current = null;
              isTurnCompleteReceivedRef.current = false;
              setTimeout(() => {
                setLiveAiSubtitle('');
              }, 3500);
            }
          } else if (msg.type === 'closed' || msg.type === 'error') {
            setIsLiveConnected(false);
            setIsAiSpeaking(false);
            setConnectionStatus('disconnected');
          }
        } catch (err) {
          console.warn('Error parsing WS message:', err);
        }
      };

      ws.onerror = (_err) => {
        console.warn('WebSocket encountered transient network event');
        setIsLiveConnected(false);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsLiveConnected(false);
        setConnectionStatus('disconnected');
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };
    } catch (e) {
      console.warn('WebSocket init exception:', e);
      setIsLiveConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [scenario, setIsLiveConnected]);

  // Connect on mount or scenario change
  useEffect(() => {
    connectLiveWebSocket();
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectLiveWebSocket]);

  // Start Mic for Live Audio Streaming
  const startMicStreaming = async () => {
    try {
      audioPlayerRef.current?.init();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      userAnalyserRef.current = analyser;

      // ScriptProcessorNode for 16kHz PCM chunk extraction
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(inputCtx.destination);

      let silenceFrames = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Simple volume threshold for visual indicator
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;

        if (avg > 0.015) {
          setIsUserSpeaking(true);
          silenceFrames = 0;
        } else {
          silenceFrames++;
          if (silenceFrames > 12) {
            setIsUserSpeaking(false);
          }
        }

        // Send 16-bit PCM base64 to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Audio = floatTo16BitPCMBase64(inputData, inputCtx.sampleRate);
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              audio: base64Audio,
            })
          );
        }
      };

      setIsMicActive(true);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      alert(
        'Microphone access is required for real-time native dialogue. Please ensure microphone permissions are granted.'
      );
    }
  };

  const toggleMic = () => {
    if (isMicActive) {
      cleanupMic();
    } else {
      startMicStreaming();
    }
  };

  // Turn Studio Mode: Send typed or turn-based response
  const handleSendTurn = async (textToSend?: string) => {
    const text = textToSend || typedInput;
    if (!text.trim() || isProcessingTurn) return;

    setTypedInput('');
    setIsProcessingTurn(true);

    const userMsg: DialogueMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      // In Live mode, we can also push text directly to Live API
      if (mode === 'live' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'text',
            text: text.trim(),
          })
        );
        setIsProcessingTurn(false);
        return;
      }

      // In Studio mode, call REST backend with TTS generation
      const res = await fetch('/api/dialogue/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage: scenario.targetLanguage,
          scenario,
          messages: newMessages,
          voiceName: scenario.aiPersona.preferredVoice || 'Fenrir',
          generateAudio: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to get AI reply');
      const data = await res.json();

      const aiMsg: DialogueMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: data.replyText,
        translation: data.replyTranslation,
        timestamp: Date.now(),
        audioBase64: data.audioBase64,
        nativeExpressionsUsed: data.nativeExpressionsUsed,
      };

      setMessages([...newMessages, aiMsg]);

      // Play audio response automatically in Studio mode
      if (data.audioBase64) {
        playSinglePcmAudio(data.audioBase64);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  // Analyze single turn feedback
  const handleAnalyzeTurn = async (userMsg: DialogueMessage) => {
    try {
      setAnalyzingMessageId(userMsg.id);
      const res = await fetch('/api/feedback/analyze-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage: scenario.targetLanguage,
          cefrLevel: scenario.cefrLevel,
          scenarioContext: scenario.context,
          userUtterance: userMsg.text,
          conversationHistory: messages,
        }),
      });

      if (res.ok) {
        const feedback: TurnFeedback = await res.json();
        setAnalyzedUtterance(userMsg.text);
        setActiveFeedback(feedback);

        // Attach to message
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, feedback } : m))
        );
      }
    } catch (err) {
      console.warn('Error analyzing speech turn:', err);
    } finally {
      setAnalyzingMessageId(null);
    }
  };

  // Comprehensive Interview Termination & Report Generation Handler
  const handleEndInterviewAndReport = () => {
    console.log('Ending interview session: halting audio, mic, and WebSocket');
    
    // 1. Immediately halt audio playback
    audioPlayerRef.current?.stopAndClear();
    setIsAiSpeaking(false);

    // 2. Shut down microphone streams and processors
    cleanupMic();

    // 3. Terminate Live WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }
    setIsLiveConnected(false);
    setConnectionStatus('disconnected');

    // 4. Open assessment scorecard modal
    onOpenAssessment();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 gap-3 text-slate-100">
      {/* Top Bar: Scenario Overview & Objectives */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-purple-300 hover:text-purple-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              title="Return to the Interview Prep Hub"
            >
              <span>←</span>
              <span className="hidden sm:inline">Interview Hub</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-sm sm:text-base text-slate-100">
                {scenario.title}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-teal-500/30">
                {scenario.targetLanguage} • {scenario.cefrLevel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              <span className="text-slate-300 font-medium">Your Role:</span> {scenario.learnerRole} |{' '}
              <span className="text-slate-300 font-medium">Partner:</span> {scenario.aiPersona.name} ({scenario.aiPersona.role})
            </p>
          </div>
        </div>

        {/* Action Pills & Mode Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Connection Status Badge in Live Mode */}
          {mode === 'live' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {connectionStatus === 'connected'
                  ? 'Live API Active'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Live Offline'}
              </span>
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={connectLiveWebSocket}
                  className="ml-1 text-[10px] text-teal-400 hover:text-teal-300 underline font-semibold"
                >
                  Reconnect
                </button>
              )}
            </div>
          )}

          {/* Mode Switch: Live vs Studio */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setMode('live')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                mode === 'live'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Live Voice</span>
            </button>
            <button
              onClick={() => setMode('studio')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                mode === 'studio'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Studio Pace</span>
            </button>
          </div>

          <button
            onClick={onOpenVocabulary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Native Idioms ({scenario.keyNativeExpressions.length})</span>
          </button>

          {/* End Interview & Get Report Button */}
          <button
            id="btn-room-end-interview"
            onClick={handleEndInterviewAndReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-teal-500/25 transition-all cursor-pointer transform hover:scale-102"
            title="End interview and generate comprehensive performance report"
          >
            <Award className="w-3.5 h-3.5" />
            <span>End & Get Report</span>
          </button>
        </div>
      </div>

      {/* Enterprise AI Proctoring Status Ribbon - Only visible when anti-cheat suite is active */}
      {isProctoringActive && (
        <div className="p-2.5 sm:px-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all bg-emerald-950/30 border-emerald-500/40 text-emerald-300">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100">
                Candidate Verified: {resumeProfile?.candidateName || 'Verified Candidate'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                ID Verified
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                5-Point Gaze Matrix Armed
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium">
                Dual-Audio Acoustic Guard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenEyeGazeLab && (
              <button
                onClick={onOpenEyeGazeLab}
                className="px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 shadow-sm"
                title="Interactive Eye-Gaze Tracking Lab & Diagnostics Sandbox"
              >
                <Eye className="w-3.5 h-3.5 text-teal-400" />
                <span>Test Eye Gaze</span>
              </button>
            )}

            {onOpenProctoring && (
              <button
                onClick={onOpenProctoring}
                className="px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Manage Security</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Center Main Stage: 2-Column or Stacked Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Left Column: Real-time Audio Cockpit & Visualizer (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md">
          {/* AI Persona Visualizer Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isAiSpeaking ? 'bg-teal-400 animate-ping' : 'bg-slate-600'}`} />
                Native Persona: {scenario.aiPersona.name}
              </span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                Voice: {scenario.aiPersona.preferredVoice}
              </span>
            </div>

            {/* AI Audio Visualizer */}
            <div className="py-1">
              <AudioVisualizer
                analyser={audioPlayerRef.current?.analyser || null}
                isActive={isAiSpeaking}
                color="teal"
                height={85}
                mode={aiVisualizerMode}
                showControls={true}
                onModeChange={setAiVisualizerMode}
                isAiSpeaking={isAiSpeaking}
              />
            </div>

            <p className="text-xs text-slate-300 italic line-clamp-1">
              "{scenario.aiPersona.role} • {scenario.aiPersona.dialectAccent}"
            </p>
          </div>

          {/* User Microphone Real-Time Waveform Cockpit */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center space-y-2.5 my-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isUserSpeaking ? 'bg-cyan-400 animate-ping' : isMicActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                Real-Time Voice Waveform
              </span>
              <span className="text-[10px] font-medium font-mono text-slate-400">
                {isMicActive ? (isUserSpeaking ? 'Speaking' : 'Listening (16kHz)') : 'Muted'}
              </span>
            </div>

            {/* User Real-Time Waveform Canvas */}
            <div className="py-1">
              <AudioVisualizer
                analyser={userAnalyserRef.current}
                isActive={isMicActive}
                color="cyan"
                height={95}
                mode={userVisualizerMode}
                showControls={true}
                onModeChange={setUserVisualizerMode}
                isUserSpeaking={isUserSpeaking}
                showDecibelMeter={true}
              />
            </div>

            {/* Big Interactive Mic Button */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                id="btn-main-mic-toggle"
                onClick={toggleMic}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                  isMicActive
                    ? 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600 animate-pulse'
                    : 'bg-gradient-to-tr from-teal-500 to-cyan-500 text-slate-950 shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400'
                }`}
              >
                {isMicActive ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Mute Microphone</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Speaking (Live Waveform)</span>
                  </>
                )}
              </button>
            </div>

            <button
              id="btn-sidebar-finish-interview"
              onClick={handleEndInterviewAndReport}
              className="w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
              title="Conclude interview and review detailed scorecard"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conclude Interview & Review Scorecard</span>
            </button>
          </div>

          {/* Quick Learning Objectives Progress */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              Target Objectives for this session
            </span>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              {scenario.targetLearningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-teal-400 font-bold">•</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Live Dialogue Subtitles & Turn Transcript (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between shadow-md overflow-hidden">
          {/* Transcript Subheader */}
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-xs sm:text-sm text-slate-200">
                Live Subtitles & Conversation Transcript
              </span>
              <span className="text-xs text-slate-500">({messages.length} utterances)</span>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <button
                  onClick={() => {
                    const tempSession: SavedSession = {
                      id: `temp-${Date.now()}`,
                      scenarioId: scenario.id,
                      scenarioTitle: scenario.title,
                      targetLanguage: scenario.targetLanguage,
                      cefrLevel: scenario.cefrLevel,
                      learnerRole: scenario.learnerRole,
                      aiPersona: scenario.aiPersona,
                      context: scenario.context,
                      startedAt: messages[0]?.timestamp || Date.now(),
                      updatedAt: Date.now(),
                      messages,
                    };
                    const md = exportSessionAsMarkdown(tempSession);
                    const safeTitle = scenario.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    triggerFileDownload(md, `nativeflow-${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                  title="Export dialogue transcript as Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden sm:inline">Export .MD</span>
                </button>
              )}

              <button
                onClick={() => setShowTranslations(!showTranslations)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  showTranslations
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{showTranslations ? 'Hide English' : 'Show English Translation'}</span>
              </button>
            </div>
          </div>

          {/* Real-Time Live Subtitle HUD Banner (Synchronized with Audio Output) */}
          <div className={`px-4 py-3 border-b transition-all duration-200 ${
            isAiSpeaking
              ? 'bg-gradient-to-r from-teal-950/80 via-slate-900 to-teal-950/50 border-teal-500/40 shadow-inner'
              : isUserSpeaking
              ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/50 border-cyan-500/40 shadow-inner'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                {isAiSpeaking ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 text-[11px] animate-pulse">
                    <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>{scenario.aiPersona.name} • Spoken Live</span>
                  </span>
                ) : isUserSpeaking ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 text-[11px] animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>You • Live Voice Input</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[11px]">
                    <Radio className="w-3 h-3 text-slate-500" />
                    <span>Real-Time Voice Subtitles Ready</span>
                  </span>
                )}

                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {isAiSpeaking ? 'Synced 24kHz PCM Audio' : isUserSpeaking ? '16kHz Audio Stream' : 'Voice Cadence Ready'}
                </span>
              </div>

              {/* Pulsing Visual Waveform Bars */}
              {(isAiSpeaking || isUserSpeaking) && (
                <div className="flex items-center gap-1">
                  <span className="w-1 h-2.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-4 bg-teal-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-1 h-3.5 bg-teal-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-1 h-2 bg-teal-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Subtitle Text Content */}
            <div className="min-h-[32px] flex items-center">
              {isAiSpeaking && liveAiSubtitle ? (
                <p className="text-xs sm:text-sm font-semibold text-teal-100 leading-relaxed">
                  “{liveAiSubtitle}”
                  <span className="inline-block w-1.5 h-3.5 bg-teal-400 ml-1.5 animate-pulse align-middle" />
                </p>
              ) : isUserSpeaking && liveUserSubtitle ? (
                <p className="text-xs sm:text-sm font-semibold text-cyan-100 leading-relaxed">
                  “{liveUserSubtitle}”
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1.5 animate-pulse align-middle" />
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  {isMicActive
                    ? 'Listening... Speak your answer into the microphone.'
                    : 'Spoken dialogue will appear here synchronously with audio playback.'}
                </p>
              )}
            </div>
          </div>

          {/* Messages Scroll Area - Threaded Sequential Q&A Dialogue Flow */}
          <div className="flex-1 p-4 overflow-y-auto space-y-5">
            {(() => {
              // Pair up Questions and Responses sequentially so question is immediately followed by its answer
              interface DialogueQAPair {
                id: string;
                questionNumber: number;
                questionMsg: DialogueMessage;
                answerMsg?: DialogueMessage;
              }

              const qaRounds: DialogueQAPair[] = [];
              let activeRound: DialogueQAPair | null = null;
              let qIndex = 0;

              for (let i = 0; i < messages.length; i++) {
                const m = messages[i];
                if (m.role === 'model') {
                  qIndex++;
                  activeRound = {
                    id: `round-${qIndex}-${m.id}`,
                    questionNumber: qIndex,
                    questionMsg: m,
                  };
                  qaRounds.push(activeRound);
                } else if (m.role === 'user') {
                  if (activeRound && !activeRound.answerMsg) {
                    activeRound.answerMsg = m;
                  } else {
                    qIndex = Math.max(1, qIndex + 1);
                    qaRounds.push({
                      id: `round-user-${m.id}`,
                      questionNumber: qIndex,
                      questionMsg: {
                        id: `prompt-${m.id}`,
                        role: 'model',
                        text: 'Technical Discussion / Follow-up Inquiry',
                        timestamp: m.timestamp - 2000,
                      },
                      answerMsg: m,
                    });
                  }
                }
              }

              if (qaRounds.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Interview is ready. The interviewer will ask the first question momentarily.
                  </div>
                );
              }

              return qaRounds.map((round, rIdx) => {
                const isLastRound = rIdx === qaRounds.length - 1;
                const hasAnswer = Boolean(round.answerMsg);

                return (
                  <div
                    key={round.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5 shadow-md hover:border-slate-700/80 transition-all"
                  >
                    {/* 1. Interviewer Question Block */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 font-extrabold text-xs border border-teal-500/30 font-mono flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-400" />
                            QUESTION {round.questionNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            {scenario.aiPersona.name} <span className="text-slate-400 font-normal">({scenario.aiPersona.role})</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(round.questionMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs sm:text-sm text-slate-100 leading-relaxed">
                        <p className="font-medium whitespace-pre-wrap">{round.questionMsg.text}</p>

                        {/* Active streaming cursor indicator */}
                        {round.questionMsg.isStreaming && (
                          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800 text-[11px] text-teal-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                            <span>Voice speaking in real time...</span>
                            <span className="inline-block w-1.5 h-3 bg-teal-400 animate-pulse ml-0.5" />
                          </div>
                        )}

                        {/* Optional translation */}
                        {showTranslations && round.questionMsg.translation && (
                          <p className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 italic">
                            {round.questionMsg.translation}
                          </p>
                        )}

                        {/* Native expressions pill if AI used one */}
                        {round.questionMsg.nativeExpressionsUsed && round.questionMsg.nativeExpressionsUsed.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {round.questionMsg.nativeExpressionsUsed.map((exp, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                              >
                                Idiom: <strong>{exp.phrase}</strong> — {exp.meaning}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Audio Replay for Question */}
                        {round.questionMsg.audioBase64 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-800/60">
                            <button
                              onClick={() => playSinglePcmAudio(round.questionMsg.audioBase64!)}
                              className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Replay Spoken Question</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Direct Thread Connector to Candidate Response (One After Another) */}
                    <div className="ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-teal-500/30 space-y-2 pt-1">
                      {hasAnswer ? (
                        /* Candidate Response Content */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold text-[11px] border border-cyan-500/30">
                                👤 YOUR ANSWER
                              </span>
                              <span className="text-[11px] font-semibold text-slate-300">
                                Candidate Verbal Response
                              </span>
                            </div>
                            {round.answerMsg?.timestamp && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(round.answerMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs sm:text-sm text-teal-100 leading-relaxed shadow-sm">
                            <p className="font-medium whitespace-pre-wrap">{round.answerMsg?.text}</p>

                            {/* Streaming indicator for user audio transcription */}
                            {round.answerMsg?.isStreaming && (
                              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-teal-800/60 text-[11px] text-cyan-300 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                <span>Transcribing spoken audio...</span>
                              </div>
                            )}

                            {/* User audio replay if captured */}
                            {round.answerMsg?.audioBase64 && (
                              <button
                                onClick={() => playSinglePcmAudio(round.answerMsg!.audioBase64!)}
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors mt-2"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Replay Your Spoken Answer</span>
                              </button>
                            )}
                          </div>

                          {/* Recruiter Turn Evaluation Card */}
                          {round.answerMsg?.feedback ? (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs shadow-sm">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-300">
                                    Turn Score: <span className="text-teal-300 font-mono font-bold">{round.answerMsg.feedback.score ?? round.answerMsg.feedback.fluencyScore ?? 75}/100</span>
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    round.answerMsg.feedback.rating === 'Excellent'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : round.answerMsg.feedback.rating === 'Strong'
                                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                      : round.answerMsg.feedback.rating === 'Good'
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                      : round.answerMsg.feedback.rating === 'Average'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  }`}>
                                    {round.answerMsg.feedback.rating || 'Good'}
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setAnalyzedUtterance(round.answerMsg!.text);
                                    setActiveFeedback(round.answerMsg!.feedback!);
                                  }}
                                  className="text-[11px] font-bold text-teal-400 hover:text-teal-300 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View Breakdown</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Tags */}
                              {round.answerMsg.feedback.tags && round.answerMsg.feedback.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {round.answerMsg.feedback.tags.map((t: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                                        (round.answerMsg?.feedback?.improvementTags || []).includes(t)
                                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                      }`}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAnalyzeTurn(round.answerMsg!)}
                              disabled={analyzingMessageId === round.answerMsg?.id}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold transition-colors bg-slate-900/90 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 cursor-pointer shadow-sm"
                            >
                              {analyzingMessageId === round.answerMsg?.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
                                  <span>Evaluating Dimensions...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  <span>Evaluate Answer (Score + Tags + Dimensions)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : isLastRound ? (
                        /* Active Question Awaiting Response: Nested directly below the question */
                        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-cyan-300">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>Your Response to Question {round.questionNumber}</span>
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400/80">
                              {isMicActive ? (isUserSpeaking ? 'Speaking Live' : 'Microphone Listening') : 'Ready to Answer'}
                            </span>
                          </div>

                          {isUserSpeaking && liveUserSubtitle ? (
                            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/40 text-cyan-100 text-xs sm:text-sm font-semibold">
                              “{liveUserSubtitle}”
                              <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1.5 animate-pulse align-middle" />
                            </div>
                          ) : (
                            <p className="text-slate-400 text-xs italic">
                              {isMicActive
                                ? '🎙️ Speak your answer into the microphone, or type in the input bar below.'
                                : '🎙️ Click "Start Speaking" or type below to formulate your response.'}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Live User Speaking Indicator in Transcript */}
            {isMicActive && isUserSpeaking && (
              <div className="flex items-center justify-between p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-semibold text-cyan-300">Live Voice Input Active</span>
                  <span className="text-[11px] text-cyan-400/80 font-mono">Streaming 16kHz PCM</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-5 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.45s]" />
                  <span className="w-1 h-6 bg-cyan-200 rounded-full animate-bounce" />
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                </div>
              </div>
            )}

            {isProcessingTurn && (
              <div className="flex items-center gap-2 p-3 bg-slate-800/40 rounded-xl text-xs text-teal-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span>Simulating native conversational cadence and formulating reply...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Dialogue Input & Quick Rhetorical Prompts */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
            {/* Quick Rhetorical Connector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-slate-500 font-semibold uppercase text-[10px] shrink-0">
                Discourse Starters:
              </span>
              {scenario.recommendedDiscourseMarkers.map((marker, idx) => (
                <button
                  key={idx}
                  onClick={() => setTypedInput((prev) => `${marker} ${prev}`)}
                  className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-teal-300 border border-slate-700/60 shrink-0 transition-colors"
                >
                  "{marker}"
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTurn();
                  }
                }}
                placeholder={`Speak via microphone or type your response in ${scenario.targetLanguage}...`}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />

              <button
                onClick={() => handleSendTurn()}
                disabled={!typedInput.trim() || isProcessingTurn}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Respond</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Feedback Modal */}
      {activeFeedback && (
        <InlineFeedbackModal
          feedback={activeFeedback}
          userUtterance={analyzedUtterance}
          onClose={() => setActiveFeedback(null)}
          targetLanguage={scenario.targetLanguage}
        />
      )}
    </div>
  );
};
