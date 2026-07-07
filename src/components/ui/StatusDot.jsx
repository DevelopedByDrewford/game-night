import styled from 'styled-components';

const Dot = styled.div`
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $online, theme }) => (
    $online ? theme.colors.avocado : theme.colors.muted
  )};
  border: ${({ $ringWidth, $ringColor }) => `${$ringWidth}px solid ${$ringColor}`};
`;

// Same visual treatment everywhere (Lobby, Active Table, Friends) so
// presence reads as one consistent feature across the app.
export function StatusDot({ online, size = 14, ringWidth = 2, ringColor = 'transparent' }) {
  return <Dot $online={online} $size={size} $ringWidth={ringWidth} $ringColor={ringColor} />;
}
