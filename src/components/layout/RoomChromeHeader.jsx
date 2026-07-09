import { useNavigate } from 'react-router-dom';
import './RoomChromeHeader.css';

export function RoomChromeHeader({ title, showEndGameEarly = false, onEndGameEarly }) {
  const navigate = useNavigate();

  return (
    <div className="room-chrome-bar">
      <button className="room-chrome-back" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
        ←
      </button>
      <div className="room-chrome-title">{title}</div>
      {showEndGameEarly && (
        <button className="room-chrome-end-game" onClick={onEndGameEarly}>
          End Game Early
        </button>
      )}
    </div>
  );
}
