import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Coins,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Rocket,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PracticeMode } from '../../types';

interface PracticeDateTimeSelectorProps {
  practiceMode: PracticeMode;
  selectedTopic: string;
  isForNow: boolean;
  setIsForNow: (isNow: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (date: string) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  jobRole: string;
  setJobRole: (role: string) => void;
  jobResponsibilities: string;
  setJobResponsibilities: (resp: string) => void;
  walletBalance: number;
  totalCost: number;
}

export const PracticeDateTimeSelector: React.FC<PracticeDateTimeSelectorProps> = ({
  practiceMode,
  selectedTopic,
  isForNow,
  setIsForNow,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  jobRole,
  setJobRole,
  jobResponsibilities,
  setJobResponsibilities,
  walletBalance,
  totalCost,
}) => {
  // Coin breakdown calculations
  const platformFee = Math.round(totalCost * 0.16); // 8 coins for 50 total
  const processingFee = totalCost - platformFee; // 42 coins
  const remainingBalance = Math.max(0, walletBalance - totalCost);
  const hasSufficientCoins = walletBalance >= totalCost;

  // Tomorrow date default for scheduling
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
      {/* 1. When would you like to start? */}
      <div>
        <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
          When would you like to start?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setIsForNow(true)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              isForNow
                ? 'bg-teal-500/15 border-teal-500/60 shadow-sm shadow-teal-500/10'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="start_timing"
              checked={isForNow}
              onChange={() => setIsForNow(true)}
              className="w-4 h-4 text-teal-500 accent-teal-500 focus:ring-teal-400"
            />
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-teal-400" />
                <span>Start Immediately</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch room now with active camera & voice
              </p>
            </div>
          </div>

          <div
            onClick={() => setIsForNow(false)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              !isForNow
                ? 'bg-teal-500/15 border-teal-500/60 shadow-sm shadow-teal-500/10'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="start_timing"
              checked={!isForNow}
              onChange={() => setIsForNow(false)}
              className="w-4 h-4 text-teal-500 accent-teal-500 focus:ring-teal-400"
            />
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Schedule for Later</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pick calendar time & get .ics invite
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time Picker if Schedule for Later */}
        {!isForNow && (
          <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" /> Select Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-400" /> Start Time (Local)
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Job Context / Role Description (Optional) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-teal-400" />
            Job Context / Role Description (Optional)
          </label>
          <span className="text-[11px] text-teal-400/80 font-medium">
            Tailors questions to actual job
          </span>
        </div>

        <div className="space-y-2 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">
              Target Role & Company:
            </label>
            <input
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer @ Stripe"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">
              Key Responsibilities / Tech Stack:
            </label>
            <textarea
              rows={2}
              value={jobResponsibilities}
              onChange={(e) => setJobResponsibilities(e.target.value)}
              placeholder="e.g. High-throughput payment microservices, Spring Boot, DynamoDB, Kafka, latency SLAs..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none leading-relaxed"
            />
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * The AI interviewer will tailor questions specifically to this job description and real-world tech stack.
          </p>
        </div>
      </div>

      {/* 3. Wallet & Transaction Summary */}
      <div>
        <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-1.5">
          Wallet & Transaction Summary
        </label>
        <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-850 rounded-xl border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              • AI Processing Fee:
            </span>
            <span className="font-mono font-semibold text-slate-200">
              🪙 {processingFee} Coins
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              • Platform Maintenance (15%):
            </span>
            <span className="font-mono font-semibold text-slate-200">
              🪙 {platformFee} Coins
            </span>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold">
            <span className="text-slate-100 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              • Total Deducted:
            </span>
            <span className="font-mono text-amber-300 text-sm">
              🪙 {totalCost} Coins
            </span>
          </div>

          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>• Remaining Balance After Booking:</span>
            <span className="font-mono font-bold text-teal-300">
              🪙 {remainingBalance} Coins (of {walletBalance})
            </span>
          </div>
        </div>

        {!hasSufficientCoins && (
          <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Insufficient coins in wallet balance. You need {totalCost} coins.</span>
          </div>
        )}
      </div>
    </div>
  );
};
