import './PageWrap.css';

export function PageWrap({ $maxWidth, $padding, className, children, ...rest }) {
  return (
    <div
      className={['page-wrap', className].filter(Boolean).join(' ')}
      style={{
        ...($maxWidth ? { '--page-wrap-max-width': $maxWidth } : null),
        ...($padding ? { '--page-wrap-padding': $padding } : null),
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
