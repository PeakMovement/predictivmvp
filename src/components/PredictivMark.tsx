/**
 * PredictivMark — the radial crosshair identity mark.
 * Used wherever Yves is present or the brand mark is needed.
 */
export function PredictivMark({
  size = 14,
  color = "#A8C4D4",
}: {
  size?: number;
  color?: string;
}) {
  const cx = size / 2;
  const r1 = size * 0.14;
  const r2 = size * 0.32;
  const tickLen = size * 0.17;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Centre dot */}
      <circle cx={cx} cy={cx} r={size * 0.05} fill={color} />
      {/* Inner ring */}
      <circle cx={cx} cy={cx} r={r1} stroke={color} strokeWidth={0.5} opacity={0.6} fill="none" />
      {/* Outer ring */}
      <circle cx={cx} cy={cx} r={r2} stroke={color} strokeWidth={0.4} opacity={0.3} fill="none" />
      {/* Top tick */}
      <line x1={cx} y1={0} x2={cx} y2={tickLen} stroke={color} strokeWidth={0.5} opacity={0.5} />
      {/* Bottom tick */}
      <line x1={cx} y1={size - tickLen} x2={cx} y2={size} stroke={color} strokeWidth={0.5} opacity={0.5} />
      {/* Left tick */}
      <line x1={0} y1={cx} x2={tickLen} y2={cx} stroke={color} strokeWidth={0.5} opacity={0.5} />
      {/* Right tick */}
      <line x1={size - tickLen} y1={cx} x2={size} y2={cx} stroke={color} strokeWidth={0.5} opacity={0.5} />
    </svg>
  );
}
