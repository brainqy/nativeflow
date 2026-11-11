import React, { useState } from 'react';
import {
  Search,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Database,
  Cloud,
  FileCode2,
  GitBranch,
  Terminal,
  ShieldAlert,
  Smartphone,
  Bot,
  Sparkles,
  Lightbulb,
  Workflow,
  Users,
} from 'lucide-react';
import { QuestionCategory } from '../../types';

export interface TopicOption {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  description: string;
  defaultRole: string;
  defaultStack: string;
}

export const PRESET_TOPICS: TopicOption[] = [
  {
    id: 'java-backend',
    name: 'Java Backend',
    icon: '☕',
    description: 'Spring Boot, JVM internals, Concurrency, Microservices',
    defaultRole: 'Senior Backend Engineer @ Stripe',
    defaultStack: 'Spring Boot, High-throughput payment microservices, DynamoDB, Kafka',
  },
  {
    id: 'react-nextjs',
    name: 'React & Next.js',
    icon: '⚛️',
    description: 'Server Components, Hooks, State Architecture, Performance',
    defaultRole: 'Lead Frontend Engineer @ Vercel',
    defaultStack: 'Next.js App Router, React 19, TypeScript, Tailwind CSS, SSR/ISR',
  },
  {
    id: 'aws-cloud',
    name: 'AWS & Cloud',
    icon: '☁️',
    description: 'IAM, EKS, Serverless, CloudFormation, Well-Architected',
    defaultRole: 'Cloud Solutions Architect @ AWS',
    defaultStack: 'AWS ECS/EKS, Lambda, S3, CloudFront, Multi-Region Resiliency',
  },
  {
    id: 'system-design',
    name: 'System Design',
    icon: '📐',
    description: 'Distributed Cache, Partitioning, CAP Theorem, Rate Limiters',
    defaultRole: 'Staff Distributed Systems Engineer @ Uber',
    defaultStack: 'Distributed Queuing, Redis Clusters, Sharding, Global Load Balancing',
  },
  {
    id: 'python-django',
    name: 'Python / Django',
    icon: '🐍',
    description: 'Asyncio, ORM optimizations, FastAPI, REST/GraphQL',
    defaultRole: 'Senior Python Engineer @ Instagram',
    defaultStack: 'Python 3.12, FastAPI, Celery, PostgreSQL, Async I/O',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: '🗄️',
    description: 'Query planning, EXPLAIN ANALYZE, MVCC, Index tuning',
    defaultRole: 'Database Reliability Engineer @ Supabase',
    defaultStack: 'PostgreSQL 16, Connection Pooling (PgBouncer), WAL Replication',
  },
  {
    id: 'data-structures',
    name: 'Data Structures',
    icon: '⚡',
    description: 'Graph algorithms, Dynamic Programming, Tree balancing',
    defaultRole: 'Software Engineer @ Google',
    defaultStack: 'C++20 / Python, Time/Space Complexity optimization, Algorithm Design',
  },
  {
    id: 'docker-k8s',
    name: 'Docker / K8s',
    icon: '🐳',
    description: 'Ingress controllers, Helm charts, Service mesh, CI/CD',
    defaultRole: 'Principal DevOps / SRE @ Netflix',
    defaultStack: 'Kubernetes, Istio Mesh, ArgoCD, Prometheus, Zero-Downtime rollouts',
  },
  {
    id: 'qa-automation',
    name: 'QA Automation',
    icon: '🧪',
    description: 'Playwright, Cypress, Load testing, Test pyramid, TDD',
    defaultRole: 'Staff QA Automation Lead @ Airbnb',
    defaultStack: 'Playwright, TypeScript, GitHub Actions CI, Parallel E2E Test Runners',
  },
  {
    id: 'mobile-ios-android',
    name: 'Mobile / iOS & Android',
    icon: '📱',
    description: 'SwiftUI, Jetpack Compose, Offline Sync, Memory profiling',
    defaultRole: 'Senior Mobile Engineer @ Spotify',
    defaultStack: 'SwiftUI, Kotlin Multiplatform, CoreData, Clean Architecture',
  },
  {
    id: 'ai-ml-genai',
    name: 'AI & GenAI Systems',
    icon: '🤖',
    description: 'RAG pipelines, Vector databases, Embeddings, LLM evaluation',
    defaultRole: 'AI Application Engineer @ OpenAI',
    defaultStack: 'Gemini 2.5/Flash, Pinecone, LangChain, Python, Prompt Orchestration',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & AppSec',
    icon: '🛡️',
    description: 'OWASP Top 10, Zero Trust, OAuth 2.0 / OIDC, Threat modeling',
    defaultRole: 'Security Engineer @ Cloudflare',
    defaultStack: 'Cryptography, WAF Rules, Secret Management, Penetration Testing',
  },
];

interface TopicSelectionProps {
  selectedTopic: string;
  onSelectTopic: (topicName: string, defaultRole?: string, defaultStack?: string) => void;
}

export const PracticeTopicSelection: React.FC<TopicSelectionProps> = ({
  selectedTopic,
  onSelectTopic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  const filteredTopics = PRESET_TOPICS.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics: e.g. Spring, React, DevOps, System Design..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-teal-400 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid of Topics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
        {filteredTopics.map((topic) => {
          const isSelected = selectedTopic.toLowerCase() === topic.name.toLowerCase();
          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.name, topic.defaultRole, topic.defaultStack)}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                isSelected
                  ? 'bg-teal-500/15 border-teal-500/60 shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{topic.icon}</span>
                    <span className="font-semibold text-sm text-slate-100 group-hover:text-teal-300 transition-colors">
                      {topic.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {topic.description}
                </p>
              </div>
            </button>
          );
        })}

        {filteredTopics.length === 0 && (
          <div className="col-span-full py-8 text-center bg-slate-900/60 rounded-xl border border-slate-800">
            <p className="text-sm text-slate-400 mb-2">
              No matching preset found for "{searchQuery}".
            </p>
            <button
              onClick={() => onSelectTopic(searchQuery, `Engineer specializing in ${searchQuery}`, searchQuery)}
              className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold border border-teal-500/40 transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Use "{searchQuery}" as Custom Topic
            </button>
          </div>
        )}
      </div>

      {/* Or Type Custom Topic Bar */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
        <input
          type="text"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Or type a specialized custom niche (e.g. Solana Rust, Golang Microservices)..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
        />
        <button
          disabled={!customTopic.trim()}
          onClick={() => {
            if (customTopic.trim()) {
              onSelectTopic(customTopic.trim(), `Engineer specializing in ${customTopic.trim()}`, customTopic.trim());
              setCustomTopic('');
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
        >
          Apply Custom
        </button>
      </div>
    </div>
  );
};

// --- STEP 4: QUESTION CATEGORIES SELECTION COMPONENT ---

interface QuestionCategoryItem {
  id: QuestionCategory;
  title: string;
  badgeIcon: string;
  description: string;
  topicsSample: string;
}

export const CATEGORY_ITEMS: QuestionCategoryItem[] = [
  {
    id: 'conceptual',
    title: '💡 Conceptual & Theoretical',
    badgeIcon: '💡',
    description: 'Architecture principles, JVM memory, Garbage Collection, lifecycle, edge-cases',
    topicsSample: 'Memory leaks, Concurrency models, Immutability, Interface contracts',
  },
  {
    id: 'coding',
    title: '💻 Live Coding & Algorithmic Optimization',
    badgeIcon: '💻',
    description: 'Hands-on algorithms, data structure efficiency, and code snippet debugging',
    topicsSample: 'Time/space Big-O, concurrency race conditions, recursion, data structures',
  },
  {
    id: 'system_design',
    title: '📐 System Design & Scalability',
    badgeIcon: '📐',
    description: 'High-throughput microservices, Kafka streaming, Redis caching, Fault tolerance',
    topicsSample: 'Sharding, CDN caching, Eventual consistency, Disaster recovery, Load balancing',
  },
  {
    id: 'behavioral',
    title: '🤝 Behavioral & STAR Method',
    badgeIcon: '🤝',
    description: 'Cross-team conflict, ambiguous requirements, ownership, post-mortems, mentorship',
    topicsSample: 'Situation, Task, Action, Result, Leadership principles, Deadline tradeoffs',
  },
];

interface CategorySelectionProps {
  selectedTopic: string;
  selectedCategories: QuestionCategory[];
  onToggleCategory: (cat: QuestionCategory) => void;
}

export const PracticeCategorySelection: React.FC<CategorySelectionProps> = ({
  selectedTopic,
  selectedCategories,
  onToggleCategory,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Select Question Categories (Select all that apply):</span>
        <span className="font-semibold text-teal-400">
          {selectedCategories.length} selected
        </span>
      </div>

      <div className="space-y-2.5">
        {CATEGORY_ITEMS.map((cat) => {
          const isChecked = selectedCategories.includes(cat.id);
          return (
            <div
              key={cat.id}
              onClick={() => onToggleCategory(cat.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                isChecked
                  ? 'bg-teal-500/10 border-teal-500/50 shadow-sm shadow-teal-500/5'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent onClick
                  className="w-4 h-4 rounded border-slate-700 text-teal-500 focus:ring-teal-400 focus:ring-offset-slate-900 accent-teal-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    {cat.title}
                  </h4>
                  {isChecked && (
                    <span className="text-[11px] font-bold text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {cat.description}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <span className="text-slate-400 font-medium">Focus:</span> {cat.topicsSample}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
