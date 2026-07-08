import { useState } from 'react';
import styled from 'styled-components';
import { CARD_DEFS, CARD_ORDER, DECKS } from '../../utils/cards.js';

function rowsFor(ruleset) {
  const counts = DECKS[ruleset] || DECKS.classic;
  return CARD_ORDER.filter((id) => counts[id] > 0).map((id) => ({ id, copies: counts[id], ...CARD_DEFS[id] }));
}

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 18px;
  color: #2e2013;
  margin-bottom: 10px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Entry = styled.div`
  padding: 9px 0;
  border-bottom: 1px dashed rgba(46, 32, 19, 0.15);

  &:last-child {
    border-bottom: none;
  }
`;

const EntryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
`;

const ValueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.terracotta};
  color: ${({ theme }) => theme.colors.surface};
  font-size: 10px;
  font-weight: 800;
  flex: none;
`;

const CardNameText = styled.div`
  font-weight: 700;
  font-size: 13px;
  color: #2e2013;
`;

const CopiesText = styled.div`
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: rgba(46, 32, 19, 0.5);
  white-space: nowrap;
`;

const EffectText = styled.div`
  font-size: 12px;
  line-height: 1.45;
  color: rgba(46, 32, 19, 0.75);
`;

function ReferenceList({ ruleset }) {
  return (
    <List>
      {rowsFor(ruleset).map((row) => (
        <Entry key={row.id}>
          <EntryHeader>
            <ValueBadge>{row.value}</ValueBadge>
            <CardNameText>{row.name}</CardNameText>
            <CopiesText>×{row.copies}</CopiesText>
          </EntryHeader>
          <EffectText>{row.description}</EffectText>
        </Entry>
      ))}
    </List>
  );
}

const DesktopPanel = styled.div`
  flex: 1;
  min-width: 260px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  height: fit-content;

  @media (max-width: 640px) {
    display: none;
  }
`;

const Tab = styled.button`
  display: none;

  @media (max-width: 640px) {
    display: block;
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    background: ${({ theme }) => theme.colors.terracotta};
    color: ${({ theme }) => theme.colors.surface};
    border: none;
    border-radius: 12px 0 0 12px;
    padding: 14px 7px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
    z-index: 5;
    box-shadow: ${({ theme }) => theme.shadows.button};
  }
`;

const Backdrop = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    background: rgba(20, 14, 8, 0.4);
    z-index: 5;
  }
`;

const Drawer = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: block;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(300px, 86vw);
    background: ${({ theme }) => theme.colors.surface};
    box-shadow: ${({ theme }) => theme.shadows.card};
    padding: 22px 16px;
    overflow-y: auto;
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform 0.25s ease;
    z-index: 6;
  }
`;

const CloseRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
`;

const CloseButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  width: 30px;
  height: 30px;
  background: #fff;
  color: #2e2013;
  font-size: 15px;
  cursor: pointer;
`;

// Persistent panel on desktop (sits alongside the action log); a peeking
// edge tab that slides out a drawer on mobile, so it doesn't eat table
// space on small screens.
export function RulesReferencePanel({ ruleset }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DesktopPanel>
        <Title>Card Reference</Title>
        <ReferenceList ruleset={ruleset} />
      </DesktopPanel>

      <Tab onClick={() => setOpen(true)} aria-label="Open card reference">
        Reference
      </Tab>
      <Backdrop $open={open} onClick={() => setOpen(false)} />
      <Drawer $open={open}>
        <CloseRow>
          <CloseButton onClick={() => setOpen(false)} aria-label="Close card reference">
            ✕
          </CloseButton>
        </CloseRow>
        <Title>Card Reference</Title>
        <ReferenceList ruleset={ruleset} />
      </Drawer>
    </>
  );
}
