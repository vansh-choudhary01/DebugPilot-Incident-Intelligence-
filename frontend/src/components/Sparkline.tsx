import type { MetricPoint } from "../api/client.js";

type Props = {
  points: MetricPoint[];
  label: string;
  unit: string;
};

export function Sparkline({ points, label, unit }: Props) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 36 - ((point.value - min) / range) * 32;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const latest = values.at(-1) ?? 0;

  return (
    <div className="sparkline">
      <div className="sparkline-header">
        <span>{label}</span>
        <strong>{Math.round(latest)}{unit}</strong>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`${label} trend`}>
        <path d={path} />
      </svg>
    </div>
  );
}
