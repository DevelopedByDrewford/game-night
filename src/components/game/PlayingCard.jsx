import styled from 'styled-components';

const Card = styled.div`
  flex: none;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ $radius }) => $radius}px;
  background: repeating-linear-gradient(
    45deg,
    ${({ $stripe }) => $stripe}33,
    ${({ $stripe }) => $stripe}33 ${({ $stripeSize }) => $stripeSize}px,
    ${({ theme }) => theme.colors.surface} ${({ $stripeSize }) => $stripeSize}px,
    ${({ theme }) => theme.colors.surface} ${({ $stripeSize }) => $stripeSize * 2}px
  );
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: ${({ $hasLabel }) => ($hasLabel ? '8px' : '0')};
`;

const Label = styled.div`
  font-weight: 800;
  font-size: 13px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 2px 8px;
`;

// Abstract, swappable placeholder for card art — real artwork is a future
// rendering-layer concern (theme lookup by cardId) that never touches this
// component's layout contract (width/height/radius/label).
export function PlayingCard({ width = 70, height = 98, radius = 10, stripe = '#C8592F', stripeSize = 7, label }) {
  return (
    <Card $w={width} $h={height} $radius={radius} $stripe={stripe} $stripeSize={stripeSize} $hasLabel={Boolean(label)}>
      {label && <Label>{label}</Label>}
    </Card>
  );
}
