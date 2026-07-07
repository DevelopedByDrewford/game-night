import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 32px;
  border-bottom: 1px solid rgba(46, 32, 19, 0.12);
  background: ${({ theme }) => theme.colors.surface};
  position: relative;
  z-index: 1;
`;

const BackButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  background: #fff;
  flex: none;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 20px;
`;

const EndGameButton = styled.button`
  margin-left: auto;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 13px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  background: #fff;
  font-family: inherit;
`;

export function RoomChromeHeader({ title, showEndGameEarly = false, onEndGameEarly }) {
  const navigate = useNavigate();

  return (
    <Bar>
      <BackButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
        ←
      </BackButton>
      <Title>{title}</Title>
      {showEndGameEarly && (
        <EndGameButton onClick={onEndGameEarly}>End Game Early</EndGameButton>
      )}
    </Bar>
  );
}
