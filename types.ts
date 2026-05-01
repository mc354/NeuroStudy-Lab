export type CourseSubject = 'Neuroscience' | 'Computer Science' | 'Psychology' | 'Biology' | 'Chemistry' | 'Math' | 'Other';

export type StudyMethod = 
  | 'Active Recall'
  | 'Pomodoro'
  | 'Blurting'
  | 'Teach-Back'
  | 'Spaced Repetition'
  | 'Passive Reading Control';

export const STUDY_METHODS: StudyMethod[] = [
  'Active Recall',
  'Pomodoro',
  'Blurting',
  'Teach-Back',
  'Spaced Repetition',
  'Passive Reading Control',
];

export type ExperimentDraft = {
  topic: string;
  course: string;
  subject: CourseSubject;
  duration: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night';
  methodMode: 'random' | 'manual';
  method: StudyMethod;
};

export type SessionMetrics = {
  score: number;
  confidence: number;
  focus: number;
  fatigue: number;
  notes: string;
};

export type StudySession = {
  id: string;
  topic: string;
  course: string;
  subject: CourseSubject;
  method: StudyMethod;
  duration: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Late Night';
  score: number;
  confidence: number;
  focus: number;
  fatigue: number;
  notes: string;
  cognitiveEfficiency: number;
  createdAt: string;
};
