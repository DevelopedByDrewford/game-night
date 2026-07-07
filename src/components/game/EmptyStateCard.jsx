import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Card = styled.div`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  color: rgba(46, 32, 19, 0.55);
  font-size: 14px;
  text-align: center;
  background-color: #f6e9ce;
  background-image: radial-gradient(circle, rgba(200, 89, 47, 0.18) 1.4px, transparent 1.6px),
    radial-gradient(circle, rgba(227, 167, 62, 0.18) 1.4px, transparent 1.6px),
    radial-gradient(circle, rgba(124, 140, 74, 0.18) 1.4px, transparent 1.6px);
  background-size: 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 5px 7px, 9px 2px;
`;

const CatalogLink = styled(Link)`
  text-decoration: underline;
  font-weight: 700;
  color: inherit;
`;

export function EmptyStateCard() {
  return (
    <Card>
      Nothing else going on —
      <br />
      browse the <CatalogLink to="/catalog">catalog</CatalogLink>?
    </Card>
  );
}
