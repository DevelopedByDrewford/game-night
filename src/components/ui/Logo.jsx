import styled from 'styled-components';

// Ziggurat mark: a stepped pyramid of centered bars, widest at the bottom.
const Stack = styled.div`
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ $gap }) => $gap}px;
`;

const Bar = styled.div`
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  border-radius: ${({ $r }) => $r}px;
  background: ${({ $bg }) => $bg};
  opacity: ${({ $opacity }) => $opacity};
`;

const Wordmark = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ $fontSize }) => $fontSize}px;
  color: #f5e6c7;
  white-space: nowrap;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`;

// Proportions match the design reference at a 88px-wide base bar.
const BASE_WIDTH = 88;
const BARS = [
  { w: 28, bg: '#C8592F', opacity: 1 },
  { w: 48, bg: '#E3A73E', opacity: 1 },
  { w: 68, bg: '#7C8C4A', opacity: 1 },
  { w: 88, bg: '#C8592F', opacity: 0.55 },
];

export function LogoMark({ size = 44 }) {
  const scale = size / BASE_WIDTH;
  const barHeight = 12 * scale;
  const gap = 3 * scale;
  const radius = 3 * scale;

  return (
    <Stack $gap={gap}>
      {BARS.map((bar, i) => (
        <Bar key={i} $w={bar.w * scale} $h={barHeight} $r={radius} $bg={bar.bg} $opacity={bar.opacity} />
      ))}
    </Stack>
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
