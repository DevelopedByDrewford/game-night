import './SegmentedControl.css';

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented-control">
      {options.map((opt) => (
        <div
          key={opt.value}
          className={`segmented-control__option${opt.value === value ? ' segmented-control__option--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}
