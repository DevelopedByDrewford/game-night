import styled from 'styled-components';

export const PageWrap = styled.div`
  max-width: ${({ $maxWidth, theme }) => $maxWidth || theme.maxWidth.grid};
  margin: 0 auto;
  padding: ${({ $padding }) => $padding || '40px 32px'};
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    padding-bottom: 90px;
  }
`;
