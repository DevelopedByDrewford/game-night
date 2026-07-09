import { useState } from 'react';
import { StatusDot } from './StatusDot.jsx';
import './Avatar.css';

// size/color/border*/boxShadow vary continuously per call site (not a fixed
// set of variants), so they stay inline style rather than becoming CSS
// classes — same split as StatusDot.
export function Avatar({
  size = 42,
  color,
  imageUrl,
  online,
  showStatus = false,
  statusRingColor,
  borderColor,
  borderWidth = 1.5,
  boxShadow,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className={`avatar${onClick ? ' avatar--clickable' : ''}`} onClick={onClick}>
      <div
        className="avatar__circle"
        style={{
          width: size,
          height: size,
          background: color,
          border: `${borderWidth}px solid ${borderColor || 'var(--color-border)'}`,
          boxShadow: boxShadow || 'none',
        }}
      >
        {showImage && <img className="avatar__image" src={imageUrl} alt="" onError={() => setImageFailed(true)} />}
      </div>
      {showStatus && (
        <div className="avatar__status">
          <StatusDot online={online} size={Math.max(12, Math.round(size * 0.33))} ringWidth={2} ringColor={statusRingColor} />
        </div>
      )}
    </div>
  );
}
