import { Link } from 'react-router-dom';
import './EmptyStateCard.css';

export function EmptyStateCard() {
  return (
    <div className="empty-state-card">
      Nothing else going on —
      <br />
      browse the{' '}
      <Link className="empty-state-card__link" to="/catalog">
        catalog
      </Link>
      ?
    </div>
  );
}
