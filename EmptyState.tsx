import { GlassCard } from './GlassCard';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <GlassCard className="text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-cyan/70">Insight Pending</p>
      <h3 className="mt-3 text-2xl font-bold text-white">{title}</h3>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full border border-cyan/40 bg-cyan/10 px-5 py-3 text-sm font-medium text-cyan transition hover:bg-cyan/20"
        >
          {actionLabel}
        </button>
      ) : null}
    </GlassCard>
  );
}
