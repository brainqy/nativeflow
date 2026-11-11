import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Volume2,
  Bookmark,
  Check,
  Search,
  Sparkles,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { ConversationScenario, NativeExpression } from '../types';
import { playSinglePcmAudio } from '../utils/audioUtils';

interface VocabularyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ConversationScenario | null;
  targetLanguage: string;
}

export const VocabularyDrawer: React.FC<VocabularyDrawerProps> = ({
  isOpen,
  onClose,
  scenario,
  targetLanguage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [masteredPhrases, setMasteredPhrases] = useState<Record<string, boolean>>({});
  const [playingAudioPhrase, setPlayingAudioPhrase] = useState<string | null>(null);

  if (!isOpen) return null;

  const expressions = scenario?.keyNativeExpressions || [];
  const discourseMarkers = scenario?.recommendedDiscourseMarkers || [];

  const filteredExpressions = expressions.filter(
    (e) =>
      e.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.contextualUsage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.literalMeaning.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMastered = (phrase: string) => {
    setMasteredPhrases((prev) => ({
      ...prev,
      [phrase]: !prev[phrase],
    }));
  };

  const handlePlayAudio = async (phrase: string) => {
    try {
      setPlayingAudioPhrase(phrase);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: phrase,
          voiceName: scenario?.aiPersona?.preferredVoice || 'Fenrir',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playSinglePcmAudio(data.audioBase64);
        }
      }
    } catch (e) {
      console.warn('TTS playback error:', e);
    } finally {
      setPlayingAudioPhrase(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-5 flex flex-col justify-between shadow-2xl text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Native Idioms & Discourse Vault</h3>
                <p className="text-[11px] text-slate-400">
                  Targeted C1/C2 expressions for {targetLanguage}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-3 mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter idioms, nuance, connectors..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2">
          {/* Key Native Expressions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Idiomatic Collocations ({filteredExpressions.length})</span>
              </h4>
            </div>

            {filteredExpressions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No matching idioms found.</p>
            ) : (
              <div className="space-y-2.5">
                {filteredExpressions.map((exp, idx) => {
                  const isMastered = masteredPhrases[exp.phrase];
                  const isPlaying = playingAudioPhrase === exp.phrase;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isMastered
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{exp.phrase}</span>
                          {exp.cefrRating && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {exp.cefrRating}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePlayAudio(exp.phrase)}
                            disabled={isPlaying}
                            className="p-1.5 rounded-md bg-slate-700/60 hover:bg-slate-700 text-teal-300 transition-colors"
                            title="Pronounce with native voice"
                          >
                            {isPlaying ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => toggleMastered(exp.phrase)}
                            className={`p-1.5 rounded-md transition-colors ${
                              isMastered
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title={isMastered ? 'Mastered' : 'Mark as mastered'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {exp.phoneticOrPinyin && (
                        <p className="text-[11px] text-teal-400/90 font-mono mb-1">
                          [{exp.phoneticOrPinyin}]
                        </p>
                      )}

                      <p className="text-xs text-slate-300 mb-1 leading-relaxed">
                        <span className="font-semibold text-slate-400">Context:</span>{' '}
                        {exp.contextualUsage}
                      </p>

                      <p className="text-[11px] text-slate-400 italic">
                        <span className="font-semibold text-slate-500">Literal:</span>{' '}
                        {exp.literalMeaning}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended Discourse Markers */}
          {discourseMarkers.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5" />
                <span>Rhetorical Connectors & Flow</span>
              </h4>

              <div className="flex flex-wrap gap-1.5">
                {discourseMarkers.map((marker, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePlayAudio(marker)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-teal-500/50 text-xs text-slate-300 hover:text-teal-300 transition-colors"
                  >
                    <span>{marker}</span>
                    <Volume2 className="w-3 h-3 text-teal-400/70" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          Pro Tip: Try incorporating these expressions in your voice dialogue to elevate your CEFR score.
        </div>
      </div>
    </div>
  );
};
