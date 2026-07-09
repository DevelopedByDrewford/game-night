import './LetterTile.css';

// A single Scrabble-style letter tile. Plain CSS / no <img> — see
// PlayingCard.jsx for the equivalent pattern in Love Letter. Renders as a
// <button> only when onClick is passed (an interactive tile, e.g. picking a
// letter for Letter Strike); otherwise a plain <div> (a rack/reveal display).
export function LetterTile({
  letter,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 56,
  className,
  onClick,
  ...rest
}) {
  const classes = [
    'letter-tile',
    faceDown && 'letter-tile--face-down',
    selected && 'letter-tile--selected',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  const content = !faceDown && <span className="letter-tile__letter">{letter}</span>;

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} disabled={disabled} {...rest}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} style={style} {...rest}>
      {content}
    </div>
  );
}
