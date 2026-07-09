import './StatusDot.css';

// Same visual treatment everywhere (Lobby, Active Table, Friends) so
// presence reads as one consistent feature across the app. size/ringWidth
// vary continuously per call site (not a fixed set of variants), so those
// stay inline style rather than becoming CSS classes.
export function StatusDot({ online, size = 14, ringWidth = 2, ringColor = 'transparent' }) {
  return (
    <div
      className={`status-dot ${online ? 'status-dot--online' : 'status-dot--offline'}`}
      style={{ width: size, height: size, border: `${ringWidth}px solid ${ringColor}` }}
    />
  );
}
