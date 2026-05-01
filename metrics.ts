import { STUDY_METHODS, StudyMethod, StudySession } from '../types';

type MetricsInput = {
  score: number;
  confidence: number;
  focus: number;
  fatigue: number;
};

type MethodStats = {
  method: StudyMethod;
  avgScore: number;
  avgFocus: number;
  avgEfficiency: number;
  count: number;
};

export function calculateCognitiveEfficiency({
  score,
  confidence,
  focus,
  fatigue,
}: MetricsInput) {
  const raw = score / 10 * 50 + focus / 5 * 30 + confidence / 5 * 20 - fatigue * 3;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function groupMethodStats(sessions: StudySession[]): MethodStats[] {
  return STUDY_METHODS.map((method) => {
    const filtered = sessions.filter((session) => session.method === method);
    if (!filtered.length) {
      return { method, avgScore: 0, avgFocus: 0, avgEfficiency: 0, count: 0 };
    }

    const totals = filtered.reduce(
      (acc, session) => {
        acc.score += session.score;
        acc.focus += session.focus;
        acc.efficiency += session.cognitiveEfficiency;
        return acc;
      },
      { score: 0, focus: 0, efficiency: 0 },
    );

    return {
      method,
      avgScore: Number((totals.score / filtered.length).toFixed(1)),
      avgFocus: Number((totals.focus / filtered.length).toFixed(1)),
      avgEfficiency: Number((totals.efficiency / filtered.length).toFixed(1)),
      count: filtered.length,
    };
  });
}

export function getBestMethod(stats: MethodStats[]) {
  return [...stats].sort((a, b) => b.avgScore - a.avgScore || b.avgEfficiency - a.avgEfficiency)[0];
}

export function getBrainProfile(sessions: StudySession[], stats: MethodStats[]) {
  if (!sessions.length) {
    return 'Exploratory Learner';
  }

  const ranked = [...stats].filter((stat) => stat.count > 0).sort((a, b) => b.avgScore - a.avgScore);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const scoreSpread =
    Math.max(...sessions.map((session) => session.score)) - Math.min(...sessions.map((session) => session.score));

  const pomodoro = stats.find((stat) => stat.method === 'Pomodoro');

  const isInconsistent =
    scoreSpread >= 4 || (best && runnerUp ? Math.abs(best.avgScore - runnerUp.avgScore) <= 0.4 : false);

  if (isInconsistent) {
    return 'Exploratory Learner';
  }

  if (best && (best.method === 'Active Recall' || best.method === 'Teach-Back')) {
    return 'Deep Recall Learner';
  }

  if (pomodoro && pomodoro.avgFocus >= 4.5 && pomodoro.count > 0) {
    return 'Focus Sprint Learner';
  }

  if (best && best.method === 'Spaced Repetition') {
    return 'Memory Consolidation Learner';
  }

  return 'Exploratory Learner';
}

export function getSuggestedMethod(stats: MethodStats[]) {
  const unseen = stats.find((stat) => stat.count === 0);
  if (unseen) {
    return unseen.method;
  }

  return [...stats].sort((a, b) => a.avgEfficiency - b.avgEfficiency)[0]?.method ?? 'Active Recall';
}

export function getAverageEfficiency(sessions: StudySession[]) {
  if (!sessions.length) {
    return 0;
  }

  const total = sessions.reduce((sum, session) => sum + session.cognitiveEfficiency, 0);
  return Math.round(total / sessions.length);
}
