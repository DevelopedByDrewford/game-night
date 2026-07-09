import { useState } from 'react';
import { Link } from 'react-router-dom';
import './CatalogCard.css';

export function CatalogCard({ name, range, available, stripeColor, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className={`catalog-card${available ? '' : ' catalog-card--unavailable'}`}>
      <div
        className="catalog-card__art"
        style={{
          background: `repeating-linear-gradient(45deg, ${stripeColor}33, ${stripeColor}33 8px, var(--color-surface) 8px, var(--color-surface) 16px)`,
        }}
      >
        {showImage ? (
          <img className="catalog-card__art-image" src={imageUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          'game art'
        )}
      </div>
      <div className="catalog-card__body">
        <div className="catalog-card__name">{name}</div>
        <div className="catalog-card__range">{range}</div>
        {available ? (
          <Link className="catalog-card__play-button" to="/rooms/new">
            Play Now
          </Link>
        ) : (
          <div className="catalog-card__coming-soon">🔒 Coming Soon</div>
        )}
      </div>
    </div>
  );
}
