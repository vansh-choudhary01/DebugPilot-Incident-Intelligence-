type Props = {
  label: string;
  tone?: "good" | "warn" | "bad" | "neutral";
};

export function StatusPill({ label, tone = "neutral" }: Props) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}
