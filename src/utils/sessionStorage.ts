import { SavedSession, DialogueMessage, ConversationScenario, CEFRLevel, SessionSummary } from '../types';

const STORAGE_KEY = 'nativeflow_saved_sessions_v1';

/**
 * Retrieves all saved conversation sessions from localStorage, sorted by most recent first.
 */
export function getSavedSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: SavedSession[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || b.startedAt) - (a.updatedAt || a.startedAt));
  } catch (err) {
    console.error('Failed to load saved sessions from localStorage:', err);
    return [];
  }
}

/**
 * Saves or updates a session in localStorage.
 */
export function saveSession(session: SavedSession): void {
  try {
    const existing = getSavedSessions();
    const index = existing.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      existing[index] = {
        ...existing[index],
        ...session,
        updatedAt: Date.now(),
      };
    } else {
      existing.unshift({
        ...session,
        updatedAt: session.updatedAt || Date.now(),
      });
    }

    // Keep up to 50 sessions in local storage to prevent quota overflow
    const trimmed = existing.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

/**
 * Helper to auto-save or update an active conversation session.
 */
export function autoSaveCurrentSession(
  sessionId: string,
  scenario: ConversationScenario,
  messages: DialogueMessage[],
  summary?: SessionSummary | null
): void {
  // Only save if there's at least one user exchange
  const hasUserMessage = messages.some((m) => m.role === 'user');
  if (!hasUserMessage) return;

  const session: SavedSession = {
    id: sessionId,
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
    summary: summary || null,
  };

  saveSession(session);
}

/**
 * Retrieves a single session by ID.
 */
export function getSavedSessionById(id: string): SavedSession | null {
  const sessions = getSavedSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Deletes a session from localStorage.
 */
export function deleteSavedSession(id: string): void {
  try {
    const existing = getSavedSessions();
    const filtered = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete session from localStorage:', err);
  }
}

/**
 * Clears all saved sessions.
 */
export function clearAllSavedSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear sessions:', err);
  }
}

/**
 * Generates an exportable Markdown transcript of a conversation.
 */
export function exportSessionAsMarkdown(session: SavedSession): string {
  const dateStr = new Date(session.startedAt).toLocaleString();
  const turnsCount = session.messages.filter((m) => m.role === 'user').length;

  let md = `# NativeFlow Conversation Transcript
**Scenario:** ${session.scenarioTitle}
**Target Language:** ${session.targetLanguage} (${session.cefrLevel})
**Date:** ${dateStr}
**Your Role:** ${session.learnerRole}
**Partner:** ${session.aiPersona.name} (${session.aiPersona.role} • ${session.aiPersona.dialectAccent})
**Exchange Turns:** ${turnsCount} turns (${session.messages.length} total messages)

---

## Dialogue Transcript

`;

  session.messages.forEach((msg, idx) => {
    const speaker =
      msg.role === 'user'
        ? `🗣️ You (${session.learnerRole})`
        : `🤖 ${session.aiPersona.name}`;
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    md += `### ${idx + 1}. ${speaker} [${time}]\n\n`;
    md += `${msg.text}\n\n`;

    if (msg.translation) {
      md += `*Translation / Note:* ${msg.translation}\n\n`;
    }

    if (msg.nativeExpressionsUsed && msg.nativeExpressionsUsed.length > 0) {
      md += `**Native Idioms & Phrases:**\n`;
      msg.nativeExpressionsUsed.forEach((e) => {
        md += `- **${e.phrase}**: ${e.meaning}\n`;
      });
      md += `\n`;
    }

    if (msg.feedback) {
      const score = msg.feedback.score ?? msg.feedback.fluencyScore ?? 75;
      const rating = msg.feedback.rating || (score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : score >= 60 ? 'Average' : 'Weak');
      md += `> **Turn Score:** ${score}/100 | **Rating:** ${rating}\n`;
      if (msg.feedback.tags && msg.feedback.tags.length > 0) {
        md += `> **Quality Tags:** ${msg.feedback.tags.map((t) => `\`${t}\``).join(' ')}\n`;
      }
      if (msg.feedback.strengths && msg.feedback.strengths.length > 0) {
        md += `> **Strengths:**\n`;
        msg.feedback.strengths.forEach((s) => {
          md += `> - ${s}\n`;
        });
      }
      if (msg.feedback.improvements && msg.feedback.improvements.length > 0) {
        md += `> **Improvements:**\n`;
        msg.feedback.improvements.forEach((imp) => {
          md += `> - ${imp}\n`;
        });
      }
      if (msg.feedback.idealAnswerElevated) {
        md += `> **Interview-Ready Model Answer:** "${msg.feedback.idealAnswerElevated}"\n`;
      }
      md += `\n`;
    }
  });

  if (session.summary) {
    const score = session.summary.overallScore ?? 75;
    const rating = session.summary.overallRating || session.summary.rating || (score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : 'Average');
    md += `---

## Recruiter Interview Scorecard & Performance Assessment

**Overall Score:** ${score}/100  
**Overall Rating:** ${rating}  
**Hiring Recommendation:** ${session.summary.hiringRecommendation || (score >= 80 ? 'Hire' : 'Lean Hire')}  
**CEFR Attained:** ${session.summary.cefrAttained}  

### Recruiter Dimension Breakdown:
- **Content Quality:** ${session.summary.dimensionScores.contentQuality}% (${session.summary.dimensionBreakdown?.contentQuality?.label || 'Relevant'})
- **Clarity & Communication:** ${session.summary.dimensionScores.clarityAndCommunication}% (${session.summary.dimensionBreakdown?.clarityAndCommunication?.label || 'Clear'})
- **Depth of Knowledge:** ${session.summary.dimensionScores.depthOfKnowledge}% (${session.summary.dimensionBreakdown?.depthOfKnowledge?.label || 'Demonstrates Strong Understanding'})
- **Examples & Evidence:** ${session.summary.dimensionScores.examplesAndEvidence}% (${session.summary.dimensionBreakdown?.examplesAndEvidence?.label || 'Supported'})
- **Problem-Solving:** ${session.summary.dimensionScores.problemSolving}% (${session.summary.dimensionBreakdown?.problemSolving?.label || 'Structured Approach'})

### Key Strengths:
${(session.summary.keyStrengths || []).map((s) => `- ${s}`).join('\n')}

### Priority Improvements:
${(session.summary.priorityImprovements || session.summary.personalizedPracticeRecommendations || []).map((p) => `- ${p}`).join('\n')}

### Executive Recruiter Debrief:
${session.summary.executiveSummary}

### Mastered Expressions:
`;
    session.summary.masteredNativeExpressions.forEach((exp) => {
      md += `- **${exp.phrase}**: ${exp.meaning} *(e.g. "${exp.exampleInContext}")*\n`;
    });

    md += `\n### Recommendations:\n`;
    session.summary.personalizedPracticeRecommendations.forEach((rec) => {
      md += `- ${rec}\n`;
    });
  }

  md += `\n---\n*Generated by NativeFlow AI Voice Dialogue Simulator*\n`;
  return md;
}

/**
 * Triggers browser download for any string payload.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
