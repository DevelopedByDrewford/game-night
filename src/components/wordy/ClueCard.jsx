import './ClueCard.css';

// A single clue from the shared pool (state.availableClues). Effect text is
// intentionally NOT rendered here — docs/a-little-wordy-rules.md is the
// source of truth for what each clue does; this only shows the name/
// category/token value so players can pick one. Plain CSS / no <img>.
export function ClueCard({ title, category, value, disabled = false, onClick, className, ...rest }) {
  const classes = [
    'clue-card',
    `clue-card--${category}`,
    disabled && 'clue-card--disabled',
    onClick && 'clue-card--clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={classes}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      {...rest}
    >
      <span className="clue-card__category">{category === 'spicy' ? 'Spicy' : 'Vanilla'}</span>
      <span className="clue-card__title">{title}</span>
      <span className="clue-card__value">{value === null ? '?' : value}</span>
    </Tag>
  );
}
