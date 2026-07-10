import { useState } from 'react';
import { Link } from 'react-router-dom';
import { boxVariant } from '../../utils/boxVariants.js';
import './CatalogCard.css';

// Styled as a physical, slightly worn board-game box pulled off a shelf
// (per the design handoff's "Catalog card — worn box treatment") rather
// than a flat UI card — radius/colors/wear-corner/texture all come from
// `variantIndex` cycling through utils/boxVariants.js's 4 presets.
export function CatalogCard({ gameType, name, range, available, stripeColor, imageUrl, variantIndex = 0 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const v = boxVariant(variantIndex);

  return (
    <div
      className="catalog-card"
      style={{
        background: v.shellBg,
        borderColor: v.borderColor,
        borderRadius: v.radius,
        boxShadow: v.shadow,
        opacity: available ? 1 : 0.7,
        filter: available ? 'none' : 'grayscale(0.3)',
      }}
    >
      <div
        className="catalog-card__art"
        style={{
          background: `repeating-linear-gradient(48deg, ${stripeColor}3d, ${stripeColor}3d 9px, ${v.shellBg} 9px, ${v.shellBg} 18px)`,
          borderBottomColor: v.edgeBg,
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
          <Link className="catalog-card__play-button" to={`/rooms/new/${gameType}`}>
            Play Now
          </Link>
        ) : (
          <div className="catalog-card__coming-soon">🔒 Coming Soon</div>
        )}
      </div>

      {/* base of box peeking out beneath the lid */}
      <div className="catalog-card__edge" style={{ background: v.edgeBg }} />

      {/* worn / bumped corner exposing cardboard underneath */}
      <div
        className="catalog-card__wear"
        style={{ ...v.wearPos, width: v.wearSize, height: v.wearSize, background: v.wearColor, clipPath: v.wearClip }}
      />
    </div>
  );
}
