export const STUDY_METHODS = [
  'Active Recall',
  'Pomodoro',
  'Blurting',
  'Teach-Back',
  'Spaced Repetition',
  'Passive Reading Control',
] as const;

export type StudyMethod = (typeof STUDY_METHODS)[number];

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Late Night';
export type CourseSubject =
  | 'Neuroscience'
  | 'Computer Science'
  | 'Psychology'
  | 'Biology'
  | 'Chemistry'
  | 'Math'
  | 'Other';

export type StudySession = {
  id: string;
  topic: string;
  course: string;
  subject: CourseSubject;
  method: StudyMethod;
  duration: number;
  timeOfDay: TimeOfDay;
  score: number;
  confidence: number;
  focus: number;
  fatigue: number;
  notes: string;
  cognitiveEfficiency: number;
  createdAt: string;
};

export type ExperimentDraft = {
  topic: string;
  course: string;
  subject: CourseSubject;
  duration: number;
  timeOfDay: TimeOfDay;
  methodMode: 'random' | 'manual';
  method: StudyMethod;
};

export type SessionMetrics = Pick<
  StudySession,
  'score' | 'confidence' | 'focus' | 'fatigue' | 'notes'
>;
