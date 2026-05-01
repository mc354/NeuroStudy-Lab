import { StudyMethod } from '../types';

const toneMap: Record<StudyMethod, string> = {
  'Active Recall': 'from-cyan/20 to-cyan/5 text-cyan',
  Pomodoro: 'from-teal/20 to-teal/5 text-teal',
  Blurting: 'from-fuchsia-400/20 to-fuchsia-400/5 text-fuchsia-200',
  'Teach-Back': 'from-amber-300/20 to-amber-300/5 text-amber-200',
  'Spaced Repetition': 'from-emerald-400/20 to-emerald-400/5 text-emerald-200',
  'Passive Reading Control': 'from-slate-300/20 to-slate-300/5 text-slate-200',
};

export function MethodBadge({ method }: { method: StudyMethod }) {
  return (
    <span
      className={`inline-flex rounded-full border border-white/10 bg-gradient-to-r px-3 py-1 text-xs font-medium ${toneMap[method]}`}
    >
      {method}
    </span>
  );
}
