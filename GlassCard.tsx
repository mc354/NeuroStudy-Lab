import { PropsWithChildren } from 'react';

type GlassCardProps = PropsWithChildren<{
  className?: string;
}>;

export function GlassCard({ className = '', children }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slateglass/90 p-6 shadow-glow backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
