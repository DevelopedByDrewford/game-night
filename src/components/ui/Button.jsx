import './Button.css';

// Prop names ($variant/$fullWidth) and the polymorphic `as` prop are kept
// identical to the old styled-components API on purpose — every existing
// call site (33 across the app) uses them, and none needed to change for
// this migration. `as` can be a string tag ('button', 'a') or a component
// (e.g. react-router's Link) — same as styled-components' `as`.
export function Button({ as: Component = 'button', $variant, $fullWidth, className, ...rest }) {
  const classes = ['button', $variant === 'outline' && 'button--outline', $fullWidth && 'button--full-width', className]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes} {...rest} />;
}
