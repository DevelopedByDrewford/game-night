import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.pageBg};
    background-image: radial-gradient(rgba(46, 32, 19, 0.05) 1px, transparent 1px);
    background-size: 16px 16px;
    font-family: ${({ theme }) => theme.fonts.body};
    color: ${({ theme }) => theme.colors.ink};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    position: relative;
    min-height: 100vh;
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
  }
`;
