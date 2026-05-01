import { useEffect, useMemo, useState } from 'react';
import { BarChart } from './components/BarChart';
import { EmptyState } from './components/EmptyState';
import { GlassCard } from './components/GlassCard';
import { MethodBadge } from './components/MethodBadge';
import { MetricCard } from './components/MetricCard';
import { COURSE_SUBJECTS, DEFAULT_EXPERIMENT, METHOD_DETAILS } from './data';
import { ExperimentDraft, SessionMetrics, STUDY_METHODS, StudySession } from './types';
import {
  calculateCognitiveEfficiency,
  getAverageEfficiency,
  getBestMethod,
  getBrainProfile,
  getSuggestedMethod,
  groupMethodStats,
} from './utils/metrics';
import {
  clearAppState,
  loadAppState,
  loadSessions,
  persistAppState,
  persistSessions,
} from './utils/storage';

type Screen = 'landing' | 'setup' | 'session' | 'results' | 'dashboard' | 'methods';

type ActiveExperiment = ExperimentDraft & {
  assignedMethod: (typeof STUDY_METHODS)[number];
  startedAt: number;
};

const initialMetrics: SessionMetrics = {
  score: 7,
  confidence: 3,
  focus: 3,
  fatigue: 2,
  notes: '',
};

const SHARE_QUERY_KEY = 'share';

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getRemainingTime(experiment: ActiveExperiment) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - experiment.startedAt) / 1000));
  return Math.max(0, experiment.duration * 60 - elapsedSeconds);
}

function getScreenFromHash(): Screen {
  const hash = window.location.hash.replace('#', '');
  const screens: Screen[] = ['landing', 'setup', 'session', 'results', 'dashboard', 'methods'];
  return screens.includes(hash as Screen) ? (hash as Screen) : 'landing';
}

function getEffectivenessLabel(efficiency: number, count: number) {
  if (!count) {
    return 'Awaiting personal signal';
  }
  if (efficiency >= 80) {
    return 'High neural fit';
  }
  if (efficiency >= 65) {
    return 'Reliable performer';
  }
  if (efficiency >= 50) {
    return 'Situational performer';
  }
  return 'Needs retesting';
}

function encodeDraftForShare(draft: ExperimentDraft) {
  return window.btoa(
    JSON.stringify({
      topic: draft.topic.trim(),
      course: draft.course.trim(),
      subject: draft.subject,
      duration: draft.duration,
      timeOfDay: draft.timeOfDay,
      methodMode: draft.methodMode,
      method: draft.method,
    }),
  );
}

function decodeSharedDraft() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(SHARE_QUERY_KEY);
  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(window.atob(encoded)) as Partial<ExperimentDraft>;
    const subject = COURSE_SUBJECTS.find((item) => item === parsed.subject) ?? DEFAULT_EXPERIMENT.subject;
    const timeOfDayOptions: ExperimentDraft['timeOfDay'][] = ['Morning', 'Afternoon', 'Evening', 'Late Night'];
    const timeOfDay =
      timeOfDayOptions.find((item) => item === parsed.timeOfDay) ?? DEFAULT_EXPERIMENT.timeOfDay;
    const methodMode = parsed.methodMode === 'manual' ? 'manual' : 'random';
    const method = STUDY_METHODS.find((item) => item === parsed.method) ?? DEFAULT_EXPERIMENT.method;

    return {
      topic: parsed.topic?.trim() ?? '',
      course: parsed.course?.trim() ?? '',
      subject,
      duration:
        typeof parsed.duration === 'number' && parsed.duration >= 10 && parsed.duration <= 180
          ? parsed.duration
          : DEFAULT_EXPERIMENT.duration,
      timeOfDay,
      methodMode,
      method,
    } satisfies ExperimentDraft;
  } catch {
    return null;
  }
}

function App() {
  const restoredState = useMemo(() => loadAppState(), []);
  const [screen, setScreen] = useState<Screen>(() => restoredState?.screen ?? getScreenFromHash());
  const [sessions, setSessions] = useState<StudySession[]>(() => loadSessions());
  const [draft, setDraft] = useState<ExperimentDraft>(() => restoredState?.draft ?? DEFAULT_EXPERIMENT);
  const [activeExperiment, setActiveExperiment] = useState<ActiveExperiment | null>(
    () => restoredState?.activeExperiment ?? null,
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [metrics, setMetrics] = useState<SessionMetrics>(() => restoredState?.metrics ?? initialMetrics);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    persistAppState({
      draft,
      activeExperiment,
      metrics,
      screen,
    });
  }, [activeExperiment, draft, metrics, screen]);

  useEffect(() => {
    const onHashChange = () => setScreen(getScreenFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const sharedDraft = decodeSharedDraft();
    if (!sharedDraft) {
      return;
    }

    setDraft(sharedDraft);
    setScreen('setup');
    window.location.hash = 'setup';
  }, []);

  useEffect(() => {
    if (!activeExperiment || screen !== 'session') {
      return;
    }

    setTimeRemaining(getRemainingTime(activeExperiment));
  }, [activeExperiment, screen]);

  useEffect(() => {
    if (screen !== 'session' || !activeExperiment) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining(getRemainingTime(activeExperiment));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeExperiment, screen]);

  const methodStats = useMemo(() => groupMethodStats(sessions), [sessions]);
  const bestMethod = useMemo(() => getBestMethod(methodStats), [methodStats]);
  const brainProfile = useMemo(() => getBrainProfile(sessions, methodStats), [methodStats, sessions]);
  const suggestedMethod = useMemo(() => getSuggestedMethod(methodStats), [methodStats]);
  const avgEfficiency = useMemo(() => getAverageEfficiency(sessions), [sessions]);
  const methodIntelligence = useMemo(
    () =>
      methodStats.map((stat) => {
        const methodSessions = sessions.filter((session) => session.method === stat.method);
        const subjectSummary = COURSE_SUBJECTS.map((subject) => {
          const subjectSessions = methodSessions.filter((session) => session.subject === subject);
          if (!subjectSessions.length) {
            return null;
          }

          const avgScore =
            subjectSessions.reduce((sum, session) => sum + session.score, 0) / subjectSessions.length;
          const avgEfficiency =
            subjectSessions.reduce((sum, session) => sum + session.cognitiveEfficiency, 0) / subjectSessions.length;

          return {
            subject,
            count: subjectSessions.length,
            avgScore: Number(avgScore.toFixed(1)),
            avgEfficiency: Math.round(avgEfficiency),
          };
        })
          .filter(Boolean)
          .sort((a, b) => {
            const safeA = a as NonNullable<typeof a>;
            const safeB = b as NonNullable<typeof b>;
            return safeB.avgEfficiency - safeA.avgEfficiency || safeB.avgScore - safeA.avgScore;
          }) as Array<{
          subject: (typeof COURSE_SUBJECTS)[number];
          count: number;
          avgScore: number;
          avgEfficiency: number;
        }>;

        return {
          ...stat,
          details: METHOD_DETAILS[stat.method],
          effectivenessLabel: getEffectivenessLabel(stat.avgEfficiency, stat.count),
          bestSubject: subjectSummary[0] ?? null,
          secondarySubjects: subjectSummary.slice(1, 3),
        };
      }),
    [methodStats, sessions],
  );

  const startExperiment = () => {
    const assignedMethod =
      draft.methodMode === 'random'
        ? STUDY_METHODS[Math.floor(Math.random() * STUDY_METHODS.length)]
        : draft.method;

    setActiveExperiment({
      ...draft,
      assignedMethod,
      startedAt: Date.now(),
    });
    setMetrics(initialMetrics);
    setScreen('session');
    window.location.hash = 'session';
  };

  const completeExperiment = () => {
    if (!activeExperiment) {
      return;
    }

    const cognitiveEfficiency = calculateCognitiveEfficiency(metrics);
    const newSession: StudySession = {
      id: crypto.randomUUID(),
      topic: activeExperiment.topic,
      course: activeExperiment.course,
      subject: activeExperiment.subject,
      method: activeExperiment.assignedMethod,
      duration: activeExperiment.duration,
      timeOfDay: activeExperiment.timeOfDay,
      score: metrics.score,
      confidence: metrics.confidence,
      focus: metrics.focus,
      fatigue: metrics.fatigue,
      notes: metrics.notes,
      cognitiveEfficiency,
      createdAt: new Date().toISOString(),
    };

    setSessions((current) => [newSession, ...current]);
    setActiveExperiment(null);
    setDraft(DEFAULT_EXPERIMENT);
    setMetrics(initialMetrics);
    clearAppState();
    setScreen('dashboard');
    window.location.hash = 'dashboard';
  };

  const resetData = () => {
    setSessions([]);
    setActiveExperiment(null);
    setDraft(DEFAULT_EXPERIMENT);
    setMetrics(initialMetrics);
    clearAppState();
    setScreen('dashboard');
    window.location.hash = 'dashboard';
  };

  const shareLink = useMemo(() => {
    const url = new URL(window.location.href);
    url.hash = 'setup';
    url.searchParams.set(SHARE_QUERY_KEY, encodeDraftForShare(draft));
    return url.toString();
  }, [draft]);

  const shareSetup = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'NeuroStudy Lab Experiment',
          text: 'Try this NeuroStudy Lab experiment setup.',
          url: shareLink,
        });
        setShareState('shared');
        return;
      }

      await navigator.clipboard.writeText(shareLink);
      setShareState('copied');
    } catch {
      setShareState('error');
    }
  };

  useEffect(() => {
    if (shareState === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => setShareState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareState]);

  const currentMethod = activeExperiment ? METHOD_DETAILS[activeExperiment.assignedMethod] : null;

  return (
    <div className="app-shell min-h-screen text-white">
      <div className="grid-surface min-h-screen bg-neuro-grid">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan/70">NeuroStudy Lab</p>
              <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Study experiments for real retention data.</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#setup" className="ghost-button">
                Start Experiment
              </a>
              <a href="#dashboard" className="secondary-button">
                Open Dashboard
              </a>
              <a href="#methods" className="secondary-button">
                Method Intelligence
              </a>
              <button type="button" onClick={resetData} className="secondary-button">
                Reset Data
              </button>
            </div>
          </header>

          {screen === 'landing' ? (
            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <GlassCard className="relative overflow-hidden p-8 sm:p-10 lg:p-12">
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-cyan/10 via-transparent to-transparent" />
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/80">Neuroscience-inspired study lab</p>
                <h2 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
                  Stop guessing how you learn.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                  Run study experiments and discover which methods actually work for your brain.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <a href="#setup" className="primary-button">
                    Start Experiment
                  </a>
                  <a href="#dashboard" className="secondary-button">
                    View Brain Profile
                  </a>
                  <a href="#methods" className="secondary-button">
                    Explore Methods
                  </a>
                </div>
                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">Retention Signal</p>
                    <p className="mt-3 text-3xl font-bold">{bestMethod?.avgScore?.toFixed(1) ?? '0.0'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">Cognitive Efficiency</p>
                    <p className="mt-3 text-3xl font-bold">{avgEfficiency}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">Experiments Logged</p>
                    <p className="mt-3 text-3xl font-bold">{sessions.length}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan/70">Current Brain Profile</p>
                  <h3 className="mt-4 text-3xl font-bold">{brainProfile}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Your dashboard compares methods, scores attention quality, and flags the next experiment worth running.
                  </p>
                </div>
                <div className="mt-8 space-y-4">
                  {methodStats.slice(0, 4).map((stat) => (
                    <div key={stat.method} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <MethodBadge method={stat.method} />
                        <span className="text-sm text-slate-300">{stat.avgEfficiency || 0} efficiency</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}

          {screen === 'setup' ? (
            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <GlassCard>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Experiment Setup</p>
                <h2 className="mt-3 text-3xl font-bold">Configure your next study run.</h2>
                <div className="mt-8 grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">Topic</span>
                    <input
                      className="field"
                      value={draft.topic}
                      onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
                      placeholder="Basal ganglia circuitry"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">Course</span>
                    <input
                      className="field"
                      value={draft.course}
                      onChange={(event) => setDraft((current) => ({ ...current, course: event.target.value }))}
                      placeholder="Cognitive Neuroscience"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">Course subject</span>
                    <select
                      className="field"
                      value={draft.subject}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          subject: event.target.value as ExperimentDraft['subject'],
                        }))
                      }
                    >
                      {COURSE_SUBJECTS.map((subject) => (
                        <option key={subject} value={subject} className="bg-slate-900">
                          {subject}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Session length</span>
                      <input
                        type="number"
                        min={10}
                        max={180}
                        className="field"
                        value={draft.duration}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            duration: Number(event.target.value) || 10,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Time of day</span>
                      <select
                        className="field"
                        value={draft.timeOfDay}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            timeOfDay: event.target.value as ExperimentDraft['timeOfDay'],
                          }))
                        }
                      >
                        {['Morning', 'Afternoon', 'Evening', 'Late Night'].map((slot) => (
                          <option key={slot} value={slot} className="bg-slate-900">
                            {slot}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3">
                    <span className="text-sm text-slate-300">Method assignment</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, methodMode: 'random' }))}
                        className={`rounded-2xl border p-4 text-left transition ${
                          draft.methodMode === 'random'
                            ? 'border-cyan/60 bg-cyan/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-semibold text-white">Randomize method</p>
                        <p className="mt-2 text-sm text-slate-300">Useful when you want a cleaner experiment design.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, methodMode: 'manual' }))}
                        className={`rounded-2xl border p-4 text-left transition ${
                          draft.methodMode === 'manual'
                            ? 'border-cyan/60 bg-cyan/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-semibold text-white">Choose method</p>
                        <p className="mt-2 text-sm text-slate-300">Run a targeted follow-up on a specific strategy.</p>
                      </button>
                    </div>
                    <select
                      className="field"
                      disabled={draft.methodMode !== 'manual'}
                      value={draft.method}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          method: event.target.value as ExperimentDraft['method'],
                        }))
                      }
                    >
                      {STUDY_METHODS.map((method) => (
                        <option key={method} value={method} className="bg-slate-900">
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={startExperiment}
                    disabled={!draft.topic.trim() || !draft.course.trim() || !draft.subject.trim()}
                  >
                    Launch Session
                  </button>
                  <a href="#dashboard" className="secondary-button">
                    Back to Dashboard
                  </a>
                  <button type="button" className="ghost-button" onClick={shareSetup}>
                    Share Setup Link
                  </button>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {shareState === 'copied' && 'Shareable link copied to clipboard.'}
                  {shareState === 'shared' && 'Share sheet opened with your experiment link.'}
                  {shareState === 'error' &&
                    'Unable to share automatically here. Copy the current URL to send this setup.'}
                  {shareState === 'idle' &&
                    'Share this experiment configuration so someone else can open the app with the same setup prefilled.'}
                </p>
                <label className="mt-4 grid gap-2">
                  <span className="text-sm text-slate-300">Generated share link</span>
                  <input className="field text-sm text-slate-300" readOnly value={shareLink} />
                </label>
              </GlassCard>

              <GlassCard>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Method Library</p>
                <div className="mt-6 space-y-4">
                  {STUDY_METHODS.map((method) => (
                    <div key={method} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <MethodBadge method={method} />
                        {draft.methodMode === 'manual' && draft.method === method ? (
                          <span className="text-xs uppercase tracking-[0.18em] text-cyan/80">Selected</span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-medium text-white">{METHOD_DETAILS[method].label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{METHOD_DETAILS[method].summary}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}

          {screen === 'session' && activeExperiment && currentMethod ? (
            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <GlassCard className="overflow-hidden">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Live Session</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <MethodBadge method={activeExperiment.assignedMethod} />
                  <span className="text-sm text-slate-300">
                    {activeExperiment.subject} • {activeExperiment.course} • {activeExperiment.topic}
                  </span>
                </div>
                <div className="mt-10 rounded-[28px] border border-cyan/20 bg-gradient-to-br from-cyan/15 via-white/5 to-transparent p-8 text-center">
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan/70">Timer</p>
                  <p className="mt-4 text-6xl font-bold tabular-nums sm:text-7xl">{formatTime(timeRemaining)}</p>
                  <p className="mt-4 text-sm text-slate-300">
                    {timeRemaining > 0 ? 'Neural focus window active.' : 'Experiment window complete. Record your outcome.'}
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="#results" className="primary-button">
                    Finish Session
                  </a>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setTimeRemaining(activeExperiment.duration * 60)}
                  >
                    Restart Timer
                  </button>
                </div>
              </GlassCard>

              <GlassCard>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Protocol Instructions</p>
                <h2 className="mt-3 text-3xl font-bold">{activeExperiment.assignedMethod}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">{currentMethod.summary}</p>
                <div className="mt-8 space-y-4">
                  {currentMethod.instructions.map((instruction, index) => (
                    <div key={instruction} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-sm font-semibold text-cyan">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-200">{instruction}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}

          {screen === 'results' && activeExperiment ? (
            <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <GlassCard>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Experiment Complete</p>
                <h2 className="mt-3 text-3xl font-bold">Log your observed outcome.</h2>
                <div className="mt-8 grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Score out of 10</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="field"
                        value={metrics.score}
                        onChange={(event) =>
                          setMetrics((current) => ({ ...current, score: Number(event.target.value) || 0 }))
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Confidence 1-5</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="field"
                        value={metrics.confidence}
                        onChange={(event) =>
                          setMetrics((current) => ({ ...current, confidence: Number(event.target.value) || 1 }))
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Focus 1-5</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="field"
                        value={metrics.focus}
                        onChange={(event) =>
                          setMetrics((current) => ({ ...current, focus: Number(event.target.value) || 1 }))
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-300">Fatigue 1-5</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="field"
                        value={metrics.fatigue}
                        onChange={(event) =>
                          setMetrics((current) => ({ ...current, fatigue: Number(event.target.value) || 1 }))
                        }
                      />
                    </label>
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm text-slate-300">Notes</span>
                    <textarea
                      rows={5}
                      className="field"
                      value={metrics.notes}
                      onChange={(event) => setMetrics((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="What felt effortless? Where did attention drop? What would you rerun?"
                    />
                  </label>
                </div>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button type="button" className="primary-button" onClick={completeExperiment}>
                    Save Session
                  </button>
                  <a href="#session" className="secondary-button">
                    Back to Timer
                  </a>
                </div>
              </GlassCard>

              <GlassCard>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Retention Signal</p>
                <h3 className="mt-3 text-3xl font-bold">{calculateCognitiveEfficiency(metrics)}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Cognitive efficiency combines score, focus, confidence, and fatigue into a single lab-style outcome metric.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    ['Course subject', activeExperiment.subject],
                    ['Method', activeExperiment.assignedMethod],
                    ['Session length', `${activeExperiment.duration} min`],
                    ['Time of day', activeExperiment.timeOfDay],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="text-sm font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}

          {screen === 'dashboard' ? (
            sessions.length ? (
              <section className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Best Performing Method"
                    value={bestMethod?.method ?? 'Pending'}
                    detail="Highest average score with efficiency as the tiebreaker."
                  />
                  <MetricCard
                    label="Cognitive Efficiency"
                    value={`${avgEfficiency}/100`}
                    detail="Average combined outcome across all experiments."
                  />
                  <MetricCard
                    label="Experiments Complete"
                    value={String(sessions.length)}
                    detail="Every logged run improves the quality of your brain profile."
                  />
                  <MetricCard
                    label="Brain Profile"
                    value={brainProfile}
                    detail="A label inferred from your strongest study performance patterns."
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <GlassCard>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Average Score by Method</p>
                        <h2 className="mt-3 text-3xl font-bold">Method comparison</h2>
                      </div>
                      <a href="#setup" className="ghost-button">
                        New Experiment
                      </a>
                    </div>
                    <div className="mt-8">
                      <BarChart
                        items={methodStats.map((stat) => ({
                          label: stat.method,
                          value: stat.avgScore * 10,
                          caption: stat.count ? `${stat.avgScore}/10` : 'No data',
                        }))}
                      />
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Insight Unlocked</p>
                    <h2 className="mt-3 text-3xl font-bold">{suggestedMethod}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Suggested next experiment based on the weakest or least-tested method in your current data.
                    </p>
                    <div className="mt-8 rounded-2xl border border-cyan/20 bg-cyan/10 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan/80">Next study hypothesis</p>
                      <p className="mt-3 text-lg font-medium text-white">
                        Run {suggestedMethod} on a topic you normally struggle to retain and compare the new retention signal.
                      </p>
                    </div>
                    <a href="#methods" className="mt-6 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                      Open Method Intelligence
                    </a>
                  </GlassCard>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <GlassCard>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Recent Experiments</p>
                    <div className="mt-6 space-y-4">
                      {sessions.slice(0, 4).map((session) => (
                        <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <MethodBadge method={session.method} />
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-4 font-medium text-white">{session.topic}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {session.subject} • {session.course}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
                            <span>Score {session.score}/10</span>
                            <span>Efficiency {session.cognitiveEfficiency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Lab Notes</p>
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                      <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <span>Experiment</span>
                        <span>Method</span>
                        <span>Focus</span>
                        <span>Fatigue</span>
                      </div>
                      <div className="divide-y divide-white/10">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm text-slate-200"
                          >
                            <div>
                              <p className="font-medium text-white">{session.topic}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {session.subject} • {session.course}
                              </p>
                            </div>
                            <span>{session.method}</span>
                            <span>{session.focus}/5</span>
                            <span>{session.fatigue}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </section>
            ) : (
              <EmptyState
                title="No experiments recorded yet."
                description="Start your first study run to unlock retention metrics, brain profile signals, and method comparisons."
                actionLabel="Start Experiment"
                onAction={() => {
                  window.location.hash = 'setup';
                }}
              />
            )
          ) : null}

          {screen === 'methods' ? (
            <section className="space-y-6">
              <GlassCard className="overflow-hidden p-8 sm:p-10">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan/70">Methods Intelligence</p>
                <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <h2 className="text-3xl font-bold sm:text-4xl">Your per-method study lab, all in one place.</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Review how each study method performs for you, which subjects respond best to each approach, and the exact protocol for using every method well.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a href="#setup" className="ghost-button">
                      Run New Experiment
                    </a>
                    <a href="#dashboard" className="secondary-button">
                      Back to Dashboard
                    </a>
                  </div>
                </div>
              </GlassCard>

              <div className="grid gap-6">
                {methodIntelligence.map((method) => (
                  <GlassCard key={method.method}>
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={method.method} />
                          <span className="text-xs uppercase tracking-[0.18em] text-cyan/70">
                            {method.effectivenessLabel}
                          </span>
                        </div>
                        <h3 className="mt-4 text-3xl font-bold text-white">{method.method}</h3>
                        <p className="mt-2 text-sm text-cyan/80">{method.details.label}</p>
                        <p className="mt-4 text-sm leading-7 text-slate-300">{method.details.summary}</p>
                      </div>

                      <div className="grid min-w-[280px] gap-4 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Personal effectiveness</p>
                          <p className="mt-3 text-3xl font-bold text-white">{method.avgEfficiency || 0}</p>
                          <p className="mt-2 text-sm text-slate-300">
                            {method.count ? `${method.count} experiments logged` : 'No experiments logged yet'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Average score</p>
                          <p className="mt-3 text-3xl font-bold text-white">{method.avgScore.toFixed(1)}/10</p>
                          <p className="mt-2 text-sm text-slate-300">Focus average {method.avgFocus.toFixed(1)}/5</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Best subject fit</p>
                          <p className="mt-3 text-xl font-bold text-white">
                            {method.bestSubject ? method.bestSubject.subject : 'No subject signal yet'}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {method.bestSubject
                              ? `${method.bestSubject.avgEfficiency}/100 efficiency across ${method.bestSubject.count} runs`
                              : 'Run this method across different subjects to discover the best fit.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-cyan/70">Best Subjects For This Method</p>
                        <div className="mt-5 space-y-3">
                          {method.bestSubject ? (
                            <>
                              <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
                                <p className="text-lg font-semibold text-white">{method.bestSubject.subject}</p>
                                <p className="mt-2 text-sm text-slate-300">
                                  Strongest response so far with {method.bestSubject.avgScore}/10 average score and {method.bestSubject.avgEfficiency}/100 efficiency.
                                </p>
                              </div>
                              {method.secondarySubjects.length ? (
                                method.secondarySubjects.map((subject) => (
                                  <div key={subject.subject} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-medium text-white">{subject.subject}</p>
                                      <span className="text-sm text-slate-300">{subject.avgEfficiency}/100</span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-300">
                                      {subject.avgScore}/10 average score across {subject.count} experiments.
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                                  No secondary subject pattern yet. More experiments will sharpen this method map.
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                              No subject-specific data yet for this method. Run it on a few different course subjects to reveal its best fit for you.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-cyan/70">Tips And Instructions</p>
                        <div className="mt-5 space-y-4">
                          {method.details.instructions.map((instruction, index) => (
                            <div key={`${method.method}-${instruction}`} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-sm font-semibold text-cyan">
                                {index + 1}
                              </div>
                              <p className="text-sm leading-6 text-slate-200">{instruction}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
