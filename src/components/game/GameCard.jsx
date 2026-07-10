import { useState } from 'react';
import { Link } from 'react-router-dom';
import './GameCard.css';

export function GameCard({ to, name, subtitle = 'Love Letter', playerColors, status, statusFilled, onDelete, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Link className="game-card" to={to}>
      {onDelete && (
        <button
          type="button"
          className="game-card__delete"
          aria-label="Delete room"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      )}
      <div className="game-card__header">
        <div className="game-card__thumb">
          {showImage && (
            <img className="game-card__thumb-image" src={imageUrl} alt="" onError={() => setImageFailed(true)} />
          )}
        </div>
        <div className="game-card__info">
          <div className="game-card__name">{name}</div>
          <div className="game-card__subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="game-card__row">
        <div className="game-card__players">
          {playerColors.map((color, i) => (
            <div key={i} className="game-card__player-dot" style={{ background: color }} />
          ))}
        </div>
        <div className={`game-card__badge${statusFilled ? ' game-card__badge--filled' : ''}`}>{status}</div>
      </div>
    </Link>
  );
}
