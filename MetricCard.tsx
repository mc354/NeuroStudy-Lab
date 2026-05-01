import { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  accent?: ReactNode;
};

export function MetricCard({ label, value, detail, accent }: MetricCardProps) {
  return (
    <GlassCard className="min-h-[164px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-cyan/70">{label}</p>
          <p className="mt-4 text-3xl font-bold text-white">{value}</p>
          {detail ? <p className="mt-3 max-w-[24ch] text-sm leading-6 text-slate-300">{detail}</p> : null}
        </div>
        {accent}
      </div>
    </GlassCard>
  );
}
