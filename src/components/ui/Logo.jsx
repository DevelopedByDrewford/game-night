import styled from 'styled-components';

const Mark = styled.div`
  flex: none;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  border-radius: ${({ $w }) => $w}px ${({ $w }) => $w}px 0 0;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-bottom: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  div {
    flex: 1;
  }
`;

const Wordmark = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ $fontSize }) => $fontSize}px;
  color: ${({ theme }) => theme.colors.ink};
  white-space: nowrap;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`;

export function LogoMark({ size = 44 }) {
  const height = Math.round(size * (26 / 44));
  return (
    <Mark $w={size} $h={height}>
      <div style={{ background: '#C8592F' }} />
      <div style={{ background: '#E3A73E' }} />
      <div style={{ background: '#7C8C4A' }} />
    </Mark>
  );
}

export function Logo({ size = 44, fontSize = 26, onClick, showWordmark = true }) {
  return (
    <Row $clickable={Boolean(onClick)} onClick={onClick}>
      <LogoMark size={size} />
      {showWordmark && <Wordmark $fontSize={fontSize}>Game Night</Wordmark>}
    </Row>
  );
}
