import styled from 'styled-components';

const Row = styled.div`
  display: flex;
  gap: 10px;
`;

const Option = styled.div`
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radii.cardSm};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  background: ${({ $active, theme }) => ($active ? theme.colors.terracotta : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? theme.colors.surface : '#2E2013')};
`;

export function SegmentedControl({ options, value, onChange }) {
  return (
    <Row>
      {options.map((opt) => (
        <Option key={opt.value} $active={opt.value === value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </Option>
      ))}
    </Row>
  );
}
