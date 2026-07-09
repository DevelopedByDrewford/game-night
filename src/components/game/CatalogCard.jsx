import { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.card};
  opacity: ${({ $available }) => ($available ? 1 : 0.55)};
`;

const Art = styled.div`
  height: 150px;
  background: repeating-linear-gradient(
    45deg,
    ${({ $stripe }) => $stripe}33,
    ${({ $stripe }) => $stripe}33 8px,
    ${({ theme }) => theme.colors.surface} 8px,
    ${({ theme }) => theme.colors.surface} 16px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 11px;
  color: rgba(46, 32, 19, 0.4);
  border-bottom: 1px solid rgba(46, 32, 19, 0.12);
`;

const ArtImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Body = styled.div`
  padding: 16px;
`;

const Name = styled.div`
  font-weight: 800;
  font-size: 18px;
  margin-bottom: 2px;
  color: #2e2013;
`;

const Range = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.55);
  margin-bottom: 12px;
`;

const PlayButton = styled(Link)`
  display: block;
  background: ${({ theme }) => theme.colors.terracotta};
  color: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 9px;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
`;

const ComingSoon = styled.div`
  border: 3px dashed rgba(46, 32, 19, 0.4);
  color: rgba(46, 32, 19, 0.5);
  border-radius: 20px;
  padding: 9px;
  text-align: center;
  font-weight: 700;
  font-size: 13px;
`;

export function CatalogCard({ name, range, available, stripeColor, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Card $available={available}>
      <Art $stripe={stripeColor}>
        {showImage ? (
          <ArtImage src={imageUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          'game art'
        )}
      </Art>
      <Body>
        <Name>{name}</Name>
        <Range>{range}</Range>
        {available ? (
          <PlayButton to="/rooms/new">Play Now</PlayButton>
        ) : (
          <ComingSoon>🔒 Coming Soon</ComingSoon>
        )}
      </Body>
    </Card>
  );
}
