import styled from 'styled-components';

const Panel = styled.div`
  flex: 1;
  min-width: 220px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  height: fit-content;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 18px;
  margin-bottom: 10px;
  color: #2e2013;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 340px;
  overflow-y: auto;
`;

const Entry = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.75);
  border-bottom: 1px dashed rgba(46, 32, 19, 0.2);
  padding-bottom: 6px;
`;

export function ActionLogPanel({ entries }) {
  return (
    <Panel>
      <Title>Action Log</Title>
      <List>
        {entries.map((entry, i) => (
          <Entry key={i}>{entry}</Entry>
        ))}
      </List>
    </Panel>
  );
}
