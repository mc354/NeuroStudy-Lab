import { CourseSubject, ExperimentDraft, StudyMethod } from './types';

export const STORAGE_KEY = 'neurostudy-lab-sessions';
export const COURSE_SUBJECTS: CourseSubject[] = [
  'Neuroscience',
  'Computer Science',
  'Psychology',
  'Biology',
  'Chemistry',
  'Math',
  'Other',
];

export const METHOD_DETAILS: Record<
  StudyMethod,
  { label: string; summary: string; instructions: string[] }
> = {
  'Active Recall': {
    label: 'Retrieval-heavy learning loop',
    summary: 'Pull answers from memory before checking notes to strengthen retention pathways.',
    instructions: [
      'Read the topic goals once, then hide your materials.',
      'Write everything you can recall from memory for 5 to 10 minutes.',
      'Check gaps against your notes or textbook and mark misses.',
      'Repeat one more retrieval round focused on weak points.',
    ],
  },
  Pomodoro: {
    label: 'Timed focus sprint',
    summary: 'Use structured focus intervals to reduce attention drift and maintain energy.',
    instructions: [
      'Set a deep-work sprint for 25 minutes and eliminate distractions.',
      'Study a single topic with full attention until the timer ends.',
      'Take a short 5 minute reset with no academic input.',
      'Resume for the next sprint if time remains in the session.',
    ],
  },
  Blurting: {
    label: 'Fast recall unload',
    summary: 'Empty what you know onto the page first, then refine accuracy.',
    instructions: [
      'Scan the topic briefly to activate context.',
      'Close the material and blurt everything you remember onto paper.',
      'Compare your sheet with class notes and circle missing ideas.',
      'Do one clean rewrite from memory using the corrected version.',
    ],
  },
  'Teach-Back': {
    label: 'Explain to encode',
    summary: 'Translate the material into a teachable explanation to expose weak understanding.',
    instructions: [
      'Pretend you are teaching the topic to a first-year student.',
      'Explain the concept aloud in simple, structured language.',
      'Pause wherever your explanation breaks down and review that section.',
      'Repeat the explanation once with stronger clarity and examples.',
    ],
  },
  'Spaced Repetition': {
    label: 'Memory consolidation cycle',
    summary: 'Review ideas at intervals and prioritize weak recall items over easy wins.',
    instructions: [
      'List key prompts, terms, or questions from the topic.',
      'Cycle through each prompt and answer from memory before checking.',
      'Mark difficult prompts for repeated exposure during the session.',
      'Finish by reviewing only the missed or slow items again.',
    ],
  },
  'Passive Reading Control': {
    label: 'Baseline comparison',
    summary: 'Read through your material normally to create a control condition for comparison.',
    instructions: [
      'Read the study material from start to finish without active retrieval.',
      'Highlight or underline points that seem important.',
      'Do a brief reread of any section that feels unclear.',
      'Stop when the timer ends and move directly to the results entry.',
    ],
  },
};

export const DEFAULT_EXPERIMENT: ExperimentDraft = {
  topic: '',
  course: '',
  subject: 'Neuroscience',
  duration: 30,
  timeOfDay: 'Evening',
  methodMode: 'random',
  method: 'Active Recall',
};
