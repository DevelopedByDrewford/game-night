import { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Card = styled(Link)`
  display: block;
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 20px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  text-decoration: none;
  color: inherit;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  color: #2e2013;
  font-size: 14px;
  line-height: 1;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Header = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
`;

const Thumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: repeating-linear-gradient(
    45deg,
    #e3a73e33,
    #e3a73e33 6px,
    ${({ theme }) => theme.colors.surface} 6px,
    ${({ theme }) => theme.colors.surface} 12px
  );
  flex: none;
  overflow: hidden;
`;

const ThumbImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Name = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #2e2013;
`;

const Sub = styled.div`
  font-size: 12px;
  color: rgba(46, 32, 19, 0.55);
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Players = styled.div`
  display: flex;
`;

const PlayerDot = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  margin-left: -8px;

  &:first-child {
    margin-left: 0;
  }
`;

const Badge = styled.div`
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 14px;
  background: ${({ $filled, theme }) => ($filled ? theme.colors.terracotta : 'transparent')};
  color: ${({ $filled, theme }) => ($filled ? theme.colors.surface : '#2e2013')};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
`;

export function GameCard({ to, name, subtitle = 'Love Letter', playerColors, status, statusFilled, onDelete, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Card to={to}>
      {onDelete && (
        <DeleteButton
          type="button"
          aria-label="Delete room"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </DeleteButton>
      )}
      <Header>
        <Thumb>{showImage && <ThumbImage src={imageUrl} alt="" onError={() => setImageFailed(true)} />}</Thumb>
        <div>
          <Name>{name}</Name>
          <Sub>{subtitle}</Sub>
        </div>
      </Header>
      <Row>
        <Players>
          {playerColors.map((color, i) => (
            <PlayerDot key={i} $color={color} />
          ))}
        </Players>
        <Badge $filled={statusFilled}>{status}</Badge>
      </Row>
    </Card>
  );
}
