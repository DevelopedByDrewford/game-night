import './Toggle.css';

export function Toggle({ checked, onChange }) {
  return (
    <div
      className={`toggle-track${checked ? ' toggle-track--on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className={`toggle-thumb${checked ? ' toggle-thumb--on' : ''}`} />
    </div>
  );
}
