import { COURSE_SUBJECTS, DEFAULT_EXPERIMENT, STORAGE_KEY } from '../data';
import { CourseSubject, ExperimentDraft, SessionMetrics, StudySession, StudyMethod } from '../types';

type StoredSession = StudySession & {
  subject?: CourseSubject;
};

type StoredActiveExperiment = ExperimentDraft & {
  assignedMethod: StudyMethod;
  startedAt: number;
};

type PersistedAppState = {
  draft: ExperimentDraft;
  activeExperiment: StoredActiveExperiment | null;
  metrics: SessionMetrics;
  screen: 'landing' | 'setup' | 'session' | 'results' | 'dashboard' | 'methods';
};

const APP_STATE_STORAGE_KEY = 'neurostudy-lab-app-state';

function inferSubject(course: string): CourseSubject {
  const normalized = course.toLowerCase();

  if (normalized.includes('neuro')) {
    return 'Neuroscience';
  }
  if (normalized.includes('data') || normalized.includes('computer') || normalized.includes('algorithm')) {
    return 'Computer Science';
  }
  if (normalized.includes('psych')) {
    return 'Psychology';
  }
  if (normalized.includes('bio')) {
    return 'Biology';
  }
  if (normalized.includes('chem')) {
    return 'Chemistry';
  }
  if (normalized.includes('math') || normalized.includes('calc') || normalized.includes('stats')) {
    return 'Math';
  }

  return 'Other';
}

function normalizeSession(session: StoredSession): StudySession {
  const subject =
    session.subject && COURSE_SUBJECTS.includes(session.subject)
      ? session.subject
      : inferSubject(session.course);

  return {
    ...session,
    subject,
  };
}

function normalizeDraft(draft: Partial<ExperimentDraft> | null | undefined): ExperimentDraft {
  const subject =
    draft?.subject && COURSE_SUBJECTS.includes(draft.subject) ? draft.subject : DEFAULT_EXPERIMENT.subject;
  const timeOfDayOptions: ExperimentDraft['timeOfDay'][] = ['Morning', 'Afternoon', 'Evening', 'Late Night'];
  const timeOfDay =
    draft?.timeOfDay && timeOfDayOptions.includes(draft.timeOfDay) ? draft.timeOfDay : DEFAULT_EXPERIMENT.timeOfDay;
  const methodMode = draft?.methodMode === 'manual' ? 'manual' : 'random';
  const methodOptions: StudyMethod[] = [
    'Active Recall',
    'Pomodoro',
    'Blurting',
    'Teach-Back',
    'Spaced Repetition',
    'Passive Reading Control',
  ];
  const method =
    draft?.method && methodOptions.includes(draft.method) ? draft.method : DEFAULT_EXPERIMENT.method;

  return {
    topic: draft?.topic?.trim() ?? '',
    course: draft?.course?.trim() ?? '',
    subject,
    duration:
      typeof draft?.duration === 'number' && draft.duration >= 10 && draft.duration <= 180
        ? draft.duration
        : DEFAULT_EXPERIMENT.duration,
    timeOfDay,
    methodMode,
    method,
  };
}

function normalizeMetrics(metrics: Partial<SessionMetrics> | null | undefined): SessionMetrics {
  return {
    score: typeof metrics?.score === 'number' ? metrics.score : 7,
    confidence: typeof metrics?.confidence === 'number' ? metrics.confidence : 3,
    focus: typeof metrics?.focus === 'number' ? metrics.focus : 3,
    fatigue: typeof metrics?.fatigue === 'number' ? metrics.fatigue : 2,
    notes: metrics?.notes ?? '',
  };
}

export function loadSessions() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as StoredSession[];
    const normalized = parsed.length ? parsed.map(normalizeSession) : [];
    const hasOnlyLegacySeedData =
      normalized.length > 0 && normalized.every((session) => session.id.startsWith('seed-'));

    if (hasOnlyLegacySeedData) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    return normalized;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
}

export function persistSessions(sessions: StudySession[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function loadAppState() {
  const stored = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PersistedAppState>;
    const activeExperiment = parsed.activeExperiment
      ? {
          ...normalizeDraft(parsed.activeExperiment),
          assignedMethod: parsed.activeExperiment.assignedMethod,
          startedAt: parsed.activeExperiment.startedAt,
        }
      : null;

    return {
      draft: normalizeDraft(parsed.draft),
      activeExperiment,
      metrics: normalizeMetrics(parsed.metrics),
      screen:
        parsed.screen && ['landing', 'setup', 'session', 'results', 'dashboard', 'methods'].includes(parsed.screen)
          ? parsed.screen
          : 'landing',
    } satisfies PersistedAppState;
  } catch {
    window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
    return null;
  }
}

export function persistAppState(state: PersistedAppState) {
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function clearAppState() {
  window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
}
