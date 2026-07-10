import './PlayingCard.css';

// Abstract, swappable placeholder for card art — real artwork is a future
// rendering-layer concern (theme lookup by cardId) that never touches this
// component's layout contract (width/height/radius/label). Passing
// frontImageUrl (or backImageUrl for a face-down card) renders that image
// instead; omitting both keeps today's striped placeholder as the default.
export function PlayingCard({
  width = 70,
  height = 98,
  radius = 10,
  stripe = '#C8592F',
  stripeSize = 7,
  label,
  frontImageUrl,
  backImageUrl,
  className,
  style,
  ...rest
}) {
  const imageUrl = frontImageUrl || backImageUrl;
  const hasLabel = !imageUrl && Boolean(label);

  const cardStyle = {
    width,
    height,
    borderRadius: radius,
    // Only paint the striped placeholder when there's no image — painting
    // it unconditionally left a sliver of stripe visible around real card
    // art wherever sub-pixel rounding left the smaller (border-box-relative)
    // image not quite covering the div's full background.
    ...(!imageUrl && {
      background: `repeating-linear-gradient(45deg, ${stripe}33, ${stripe}33 ${stripeSize}px, var(--color-surface) ${stripeSize}px, var(--color-surface) ${stripeSize * 2}px)`,
    }),
    ...style,
  };

  const classes = ['playing-card', hasLabel && 'playing-card--has-label', className].filter(Boolean).join(' ');

  if (imageUrl) {
    return (
      <div className={classes} style={cardStyle} {...rest}>
        <img className="playing-card__image" src={imageUrl} alt={label || ''} style={{ borderRadius: radius }} />
      </div>
    );
  }

  return (
    <div className={classes} style={cardStyle} {...rest}>
      {label && <div className="playing-card__label">{label}</div>}
    </div>
  );
}
