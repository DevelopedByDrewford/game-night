import styled from 'styled-components';
import { PlayingCard } from './PlayingCard.jsx';
import { frontImageFor } from '../../utils/cardArt.js';

const Wrap = styled.div`
  text-align: center;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`;

const DiscardLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.inkFainter};
  margin-bottom: 4px;
`;

const Row = styled.div`
  display: flex;
  gap: 3px;
  justify-content: ${({ $align }) => $align};
  flex-wrap: wrap;
`;

const EmptyText = styled.div`
  font-size: 11px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

// Shared "row of small played cards" used both under a player's own hand
// and in each OpponentSeat — kept as one component so the two stay visually
// consistent, and so DiscardsModal can reuse it at a larger size.
export function DiscardPileRow({
  discards = [],
  label = 'Discard',
  cardWidth = 22,
  cardHeight = 30,
  cardRadius = 4,
  align = 'center',
  onClick,
}) {
  return (
    <Wrap onClick={onClick} $clickable={Boolean(onClick)}>
      {label && <DiscardLabel>{label}</DiscardLabel>}
      <Row $align={align}>
        {discards.length === 0 ? (
          <EmptyText>None yet</EmptyText>
        ) : (
          discards.map((cardId, i) => (
            <PlayingCard
              key={`${cardId}-${i}`}
              width={cardWidth}
              height={cardHeight}
              radius={cardRadius}
              stripe="#C8592F"
              stripeSize={4}
              frontImageUrl={frontImageFor(cardId)}
            />
          ))
        )}
      </Row>
    </Wrap>
  );
}
