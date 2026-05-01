type BarChartItem = {
  label: string;
  value: number;
  caption: string;
};

export function BarChart({ items }: { items: BarChartItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm text-slate-200">{item.label}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-cyan/70">{item.caption}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-300 to-teal transition-all duration-500"
              style={{ width: `${Math.max(item.value, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
