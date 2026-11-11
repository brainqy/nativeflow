import React, { useState } from 'react';
import {
  Sparkles,
  BookMarked,
  PlusCircle,
  Volume2,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Flame,
  Globe2,
  RefreshCw,
  X,
  Target,
  Brain,
  MessageSquareQuote,
} from 'lucide-react';
import { ConversationScenario, CEFRLevel, LanguageOption } from '../types';
import { PRESET_SCENARIOS } from '../data/presetScenarios';

interface ScenarioSelectorProps {
  currentLanguage: LanguageOption;
  currentCefr: CEFRLevel;
  selectedScenario: ConversationScenario | null;
  onSelectScenario: (scenario: ConversationScenario) => void;
  onClose?: () => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  currentLanguage,
  currentCefr,
  selectedScenario,
  onSelectScenario,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  
  // Custom Topic Generation State
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [customDomain, setCustomDomain] = useState('Geopolitics & Strategy');
  const [customPersonaTone, setCustomPersonaTone] = useState('Intellectually Rigorous & Socratic');
  const [customVoice, setCustomVoice] = useState<'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'>('Fenrir');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScenarios, setGeneratedScenarios] = useState<ConversationScenario[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Filter presets for the current language or fallback to all available
  const languagePresets = PRESET_SCENARIOS.filter(
    (s) => s.targetLanguage.toLowerCase() === currentLanguage.id.toLowerCase()
  );

  const availablePresets = languagePresets.length > 0 ? languagePresets : PRESET_SCENARIOS;

  const domains = ['All', ...Array.from(new Set(availablePresets.map((s) => s.topicDomain.split(',')[0].trim())))];

  const filteredPresets =
    selectedDomain === 'All'
      ? availablePresets
      : availablePresets.filter((s) => s.topicDomain.includes(selectedDomain));

  const handleGenerateCustomScenarios = async () => {
    if (!customTopicInput.trim() && !customDomain) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage: currentLanguage.name,
          category: customDomain,
          userCustomTopic: customTopicInput,
          cefrLevel: currentCefr,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate custom topics (${res.status})`);
      }

      const data = await res.json();
      if (data.scenarios && Array.isArray(data.scenarios)) {
        // Enrich with fallback IDs & voice if needed
        const formatted: ConversationScenario[] = data.scenarios.map((s: any, idx: number) => ({
          ...s,
          id: s.id || `custom-${Date.now()}-${idx}`,
          targetLanguage: currentLanguage.name,
          cefrLevel: currentCefr,
          aiPersona: {
            ...s.aiPersona,
            preferredVoice: customVoice,
            dialectAccent: s.aiPersona?.dialectAccent || currentLanguage.defaultDialects[0] || 'Standard Native',
          },
        }));
        setGeneratedScenarios(formatted);
      } else {
        throw new Error('Invalid format returned by scenario generator.');
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Could not generate topic. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-5xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Conversational Topics & Persona Studio
            </h2>
            <p className="text-xs text-slate-400">
              Select or design C1/C2 native dialogue simulations in{' '}
              <span className="font-semibold text-teal-300">
                {currentLanguage.flag} {currentLanguage.name} ({currentCefr})
              </span>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 mb-6">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'presets'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>Curated Scenarios ({availablePresets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'custom'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Custom Topic Generator (AI)</span>
        </button>
      </div>

      {/* TAB 1: CURATED PRESETS */}
      {activeTab === 'presets' && (
        <div>
          {/* Domain Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDomain === dom
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {filteredPresets.map((sc) => {
              const isSelected = selectedScenario?.id === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => onSelectScenario(sc)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-500 ring-1 ring-teal-500/50 shadow-lg shadow-teal-500/10'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/80 text-teal-300 border border-teal-500/20">
                        {sc.topicDomain.split(',')[0]}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {sc.cefrLevel}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base text-slate-100 group-hover:text-teal-300 transition-colors mb-1.5">
                      {sc.title}
                    </h3>

                    {/* Premise / Context */}
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                      {sc.context}
                    </p>

                    {/* Persona Pill */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 mb-3">
                      <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                        {sc.aiPersona.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {sc.aiPersona.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sc.aiPersona.role} • {sc.aiPersona.dialectAccent}
                        </p>
                      </div>
                    </div>

                    {/* Starter Preview */}
                    <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 italic flex items-start gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">"{sc.starterMessage}"</span>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-700/40">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Target className="w-3.5 h-3.5 text-teal-400" />
                      <span>{sc.targetLearningObjectives.length} C1/C2 Objectives</span>
                    </div>

                    <button
                      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                        isSelected
                          ? 'bg-teal-500 text-slate-950'
                          : 'bg-slate-700 text-slate-200 group-hover:bg-teal-500 group-hover:text-slate-950'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <span>Engage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM TOPIC GENERATOR */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Generate Advanced Simulation from Any Topic or Article
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter any real-world debate, specialized domain (e.g. quantum computing, bioethics, M&A negotiation, film theory, constitutional law), or paste an excerpt to simulate an authentic native conversation.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Topic, Article Premise, or Dilemma
                </label>
                <textarea
                  id="custom-topic-input"
                  rows={3}
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="e.g., Debating the impact of central bank digital currencies on commercial banking margins, with a hawkish monetary economist."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domain / Field
                  </label>
                  <select
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                  >
                    <option value="Geopolitics & Strategy">Geopolitics & Strategy</option>
                    <option value="High-Stakes Finance & VC">High-Stakes Finance & VC</option>
                    <option value="Philosophy & Cognitive Ethics">Philosophy & Cognitive Ethics</option>
                    <option value="Arts, Film & Architectural Critique">Arts & Architecture</option>
                    <option value="Advanced Scientific Inquiry">Advanced Scientific Inquiry</option>
                    <option value="Corporate Crisis & Boardroom">Corporate Crisis & Boardroom</option>
                    <option value="Nuanced Intellectual Salon">Nuanced Intellectual Salon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Persona Tone
                  </label>
                  <select
                    value={customPersonaTone}
                    onChange={(e) => setCustomPersonaTone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                  >
                    <option value="Intellectually Rigorous & Socratic">Intellectual & Socratic</option>
                    <option value="Skeptical & Inquisitive Negotiator">Skeptical Negotiator</option>
                    <option value="Eloquent, Nuanced & Passionate">Eloquent & Passionate</option>
                    <option value="Direct, Executive & Decisive">Executive & Decisive</option>
                    <option value="Witty & Culturally Astute">Witty & Astute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    AI Voice Profile
                  </label>
                  <select
                    value={customVoice}
                    onChange={(e) => setCustomVoice(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                  >
                    <option value="Fenrir">Fenrir (Authoritative & Deep • Male)</option>
                    <option value="Puck">Puck (Natural & Expressive • Male)</option>
                    <option value="Charon">Charon (Measured & Resonant • Male)</option>
                    <option value="Zephyr">Zephyr (Bright & Crisp • Female)</option>
                    <option value="Kore">Kore (Warm & Eloquent • Female)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="btn-generate-custom-scenario"
                  onClick={handleGenerateCustomScenarios}
                  disabled={isGenerating || !customTopicInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-lg shadow-lg shadow-teal-500/20 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Native Scenarios...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 3 Native Scenarios</span>
                    </>
                  )}
                </button>
              </div>

              {generationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                  {generationError}
                </div>
              )}
            </div>
          </div>

          {/* Generated Results */}
          {generatedScenarios.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
                Generated Custom Scenarios (Ready to Speak)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => {
                      onSelectScenario(sc);
                      if (onClose) onClose();
                    }}
                    className="p-4 rounded-xl border border-teal-500/40 bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-all flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {sc.topicDomain}
                        </span>
                        <span className="text-xs font-semibold text-amber-300">{sc.cefrLevel}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-100 mb-1">{sc.title}</h4>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-2">{sc.context}</p>
                      
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-700/60 text-xs text-slate-300 italic mb-2">
                        "{sc.starterMessage}"
                      </div>
                    </div>

                    <button className="w-full mt-2 py-1.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-teal-400 transition-colors flex items-center justify-center gap-1">
                      <span>Launch This Voice Simulation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
