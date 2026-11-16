/** Circular progress (0–100) with the number in the middle. */
export default function ProgressRing({ value = 0, size = 120, stroke = 10, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ? `${label}: ` : ''}${v}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#9A5CFF" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p className="font-display text-2xl font-bold leading-none">{v}%</p>{label && <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">{label}</p>}</div>
      </div>
    </div>
  );
}
