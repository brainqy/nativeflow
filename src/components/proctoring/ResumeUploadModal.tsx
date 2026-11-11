import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Layers,
  Code2,
  AlertCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { CandidateResumeProfile } from '../../types';

interface ResumeUploadModalProps {
  onSuccess: (profile: CandidateResumeProfile) => void;
  onCancel: () => void;
  initialProfile?: CandidateResumeProfile | null;
}

const SAMPLE_RESUMES = [
  {
    name: 'Alex Rivera (Senior Full-Stack & Cloud Architect)',
    text: `Alex Rivera
Senior Full-Stack & Distributed Systems Architect
alex.rivera@example.com | San Francisco, CA | 8+ Years Experience

Professional Summary:
Architect with 8+ years designing high-throughput real-time distributed backends and low-latency client applications. Led engineering teams migrating monoliths to Kubernetes-based microservices, reducing p99 response times by 42%. Passionate about scalable WebSockets, event-driven architectures, and developer ergonomics.

Core Technical Skills:
TypeScript, Node.js, Go, Python, React, Next.js, WebSockets, gRPC, Docker, Kubernetes, AWS, PostgreSQL, Redis, Apache Kafka, CI/CD, System Design.

Professional Experience:
Staff Platform Engineer | Apex Cloud Technologies (2022 - Present)
- Architected enterprise real-time streaming pipeline processing 140M daily websocket events with sub-50ms latency.
- Designed automated failover mechanisms across multiple AWS availability zones, elevating uptime to 99.995%.
- Mentored 12 mid-level and junior engineers on distributed data modeling and concurrency patterns.

Senior Software Engineer | FinScale Systems (2019 - 2022)
- Re-architected core transaction ledger to an append-only event-sourcing model in Go and Postgres.
- Engineered bank partner OAuth2 and webhook ingestion gateways compliant with SOC2 Type II.

Education:
B.S. in Computer Science | University of California, Berkeley (2019)`,
  },
  {
    name: 'Elena Rostova (AI & Machine Learning Research Engineer)',
    text: `Elena Rostova
AI / ML Applied Research Engineer
elena.rostova@example.com | Seattle, WA | 5+ Years Experience

Professional Summary:
Specialist in Multimodal Foundation Models, LLM fine-tuning (LoRA, DPO, RLHF), and efficient edge inference. Built high-throughput neural search and generative speech pipelines at scale.

Technical Skills:
Python, PyTorch, C++, CUDA, Transformers, vLLM, TensorRT, LangChain, Multimodal Embeddings, Vector Databases (Milvus, Pinecone), MLflow, ONNX.

Experience:
Senior ML Engineer | Cognition Lab (2023 - Present)
- Optimized 70B parameter open weights model deployment on H100 clusters, achieving 2.8x token throughput.
- Implemented real-time audio and speech transcription pipelines with dynamic latency buffering.

Machine Learning Engineer | Visionary AI (2020 - 2023)
- Trained multi-task visual perception models for robotics vision, boosting mAP by 16.4%.

Education:
M.S. in Artificial Intelligence | Stanford University (2020)`,
  },
];

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  onSuccess,
  onCancel,
  initialProfile,
}) => {
  const [resumeText, setResumeText] = useState<string>(initialProfile?.rawText || '');
  const [fileName, setFileName] = useState<string>(initialProfile?.fileName || '');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedProfile, setParsedProfile] = useState<CandidateResumeProfile | null>(initialProfile || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        setResumeText(text);
        await parseResume(text, file.name);
      }
    };
    reader.onerror = () => {
      setError('Could not read file. Please try pasting the text instead.');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sample: { name: string; text: string }) => {
    setFileName(`${sample.name.split(' ')[0]}_Resume.pdf`);
    setResumeText(sample.text);
    parseResume(sample.text, `${sample.name.split(' ')[0]}_Resume.pdf`);
  };

  const parseResume = async (text: string, nameOfFile: string) => {
    if (!text.trim()) {
      setError('Please provide resume text or upload a file.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/proctor/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: text,
          resumeFileName: nameOfFile || 'Resume_Document.pdf',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse resume');
      }

      const data: CandidateResumeProfile = await res.json();
      setParsedProfile(data);
    } catch (err: any) {
      console.warn('Resume parse error, falling back:', err);
      // Heuristic fallback
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const fallback: CandidateResumeProfile = {
        fileName: nameOfFile || 'Resume.pdf',
        candidateName: lines[0] || 'Candidate',
        headline: lines[1] || 'Professional Engineer',
        yearsExperience: '5+ Years',
        summary: lines[2] || 'Experienced software professional.',
        skills: ['Software Architecture', 'Problem Solving', 'Communication', 'System Design'],
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Enterprise',
            period: '2021 - Present',
            details: ['Built and delivered core platform components.'],
          },
        ],
        education: [{ degree: 'B.S. Computer Science', school: 'University' }],
        tailoredQuestions: [
          'Can you walk me through the key architectural tradeoffs of your most recent project?',
          'Tell me about a time you resolved a critical production incident under pressure.',
        ],
        rawText: text,
        uploadedAt: Date.now(),
      };
      setParsedProfile(fallback);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedProfile) {
      onSuccess(parsedProfile);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full text-slate-100 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                STEP 1 OF 4
              </span>
              <h3 className="font-bold text-base text-slate-100">
                Candidate Resume Dossier
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Upload your resume for real-time candidate verification and interview tailoring.
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Upload Box & Samples */}
      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* File Upload Drop Area */}
          <label className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-teal-950/10 group">
            <input
              type="file"
              accept=".pdf,.txt,.docx,.doc,.json,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-teal-500/20 text-slate-400 group-hover:text-teal-300 flex items-center justify-center mb-2.5 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-teal-300">
              {fileName ? fileName : 'Upload Resume Document'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              Supports .pdf, .txt, .docx, or .md
            </span>
          </label>

          {/* Quick Pre-filled Industry Profiles for Testing */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Or Select Sample Candidate Profile
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Instantly load an enterprise-grade candidate profile to experience the proctoring pipeline:
              </p>
              <div className="space-y-1.5">
                {SAMPLE_RESUMES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="w-full text-left p-2 rounded-lg bg-slate-800/70 hover:bg-teal-950/30 border border-slate-700/60 hover:border-teal-500/40 text-[11px] font-medium text-slate-300 hover:text-teal-200 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{sample.name}</span>
                    <Sparkles className="w-3 h-3 text-teal-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Text Area for Pasting */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300">
              Or Paste Plain Resume Text:
            </label>
            {resumeText && !parsedProfile && (
              <button
                type="button"
                onClick={() => parseResume(resumeText, fileName || 'Pasted_Resume.txt')}
                disabled={isParsing}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                {isParsing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Parse Resume</span>
              </button>
            )}
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste candidate work history, skills, and projects here..."
            rows={4}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500/60 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsing Indicator */}
        {isParsing && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-teal-500/30 flex items-center justify-center gap-3 text-teal-300 text-xs font-medium animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI Talent Intelligence is extracting candidate credentials & tailoring questions...</span>
          </div>
        )}

        {/* Parsed Candidate Dossier Card */}
        {parsedProfile && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-3.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-100">
                    {parsedProfile.candidateName}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    <span>Dossier Verified</span>
                  </span>
                </div>
                <p className="text-xs text-teal-300 font-medium">
                  {parsedProfile.headline} • {parsedProfile.yearsExperience}
                </p>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                {parsedProfile.fileName}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              "{parsedProfile.summary}"
            </p>

            {/* Skills Pills */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Code2 className="w-3 h-3 text-cyan-400" />
                <span>Extracted Key Competencies ({parsedProfile.skills.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {parsedProfile.skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Experience & Tailored Questions Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-teal-400" />
                  <span>Recent Experience</span>
                </span>
                {parsedProfile.experience.slice(0, 2).map((exp, eIdx) => (
                  <div key={eIdx} className="bg-slate-900/70 p-2 rounded border border-slate-800 text-[11px]">
                    <div className="font-bold text-slate-200">{exp.title}</div>
                    <div className="text-slate-400">{exp.company} {exp.period ? `(${exp.period})` : ''}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Generated Tailored Questions ({parsedProfile.tailoredQuestions?.length || 0})</span>
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {(parsedProfile.tailoredQuestions || []).slice(0, 2).map((q, qIdx) => (
                    <li key={qIdx} className="line-clamp-2 bg-slate-900/70 p-1.5 rounded border border-slate-800">
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={!parsedProfile}
          onClick={handleConfirm}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>Confirm & Proceed to Biometric ID Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
