interface Props {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: boolean;
}

export function ResultRow({ label, value, highlight, sub }: Props) {
  return (
    <div className={`result-row${highlight ? " result-row--highlight" : ""}${sub ? " result-row--sub" : ""}`}>
      <span className="result-row__label">{label}</span>
      <span className="result-row__value">{value}</span>
    </div>
  );
}
