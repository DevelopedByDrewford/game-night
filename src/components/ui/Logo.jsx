import './Logo.css';

// Proportions match the design reference at a 88px-wide base bar.
const BASE_WIDTH = 88;
const BARS = [
  { w: 28, bg: '#C8592F', opacity: 1 },
  { w: 48, bg: '#E3A73E', opacity: 1 },
  { w: 68, bg: '#7C8C4A', opacity: 1 },
  { w: 88, bg: '#C8592F', opacity: 0.55 },
];

// Ziggurat mark: a stepped pyramid of centered bars, widest at the bottom.
export function LogoMark({ size = 44 }) {
  const scale = size / BASE_WIDTH;
  const barHeight = 12 * scale;
  const gap = 3 * scale;
  const radius = 3 * scale;

  return (
    <div className="logo-mark" style={{ gap }}>
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="logo-mark__bar"
          style={{ width: bar.w * scale, height: barHeight, borderRadius: radius, background: bar.bg, opacity: bar.opacity }}
        />
      ))}
    </div>
  );
}

export function Logo({ size = 44, fontSize = 26, onClick, showWordmark = true }) {
  return (
    <div className={`logo-row${onClick ? ' logo-row--clickable' : ''}`} onClick={onClick}>
      <LogoMark size={size} />
      {showWordmark && (
        <div className="logo-wordmark" style={{ fontSize }}>
          Game Night
        </div>
      )}
    </div>
  );
}
