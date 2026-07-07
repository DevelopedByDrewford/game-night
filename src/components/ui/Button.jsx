import styled from 'styled-components';

export const Button = styled.button`
  font-family: inherit;
  font-weight: 700;
  font-size: 15px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  padding: 12px 22px;
  cursor: pointer;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  flex-shrink: 0;
  white-space: nowrap;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  background: ${({ theme, $variant }) =>
    $variant === 'outline' ? theme.colors.surface : theme.colors.terracotta};
  color: ${({ theme, $variant }) =>
    $variant === 'outline' ? theme.colors.ink : theme.colors.surface};
  box-shadow: ${({ theme, $variant }) => ($variant === 'outline' ? 'none' : theme.shadows.button)};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
