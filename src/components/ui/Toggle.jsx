import styled from 'styled-components';

const Track = styled.div`
  width: 52px;
  height: 30px;
  border-radius: 20px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: ${({ $on, theme }) => ($on ? theme.colors.avocado : '#e3dac6')};
  position: relative;
  cursor: pointer;
  flex: none;
  transition: background 0.15s;
`;

const Thumb = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  position: absolute;
  top: 1px;
  left: ${({ $on }) => ($on ? '22px' : '1px')};
  transition: left 0.15s;
`;

export function Toggle({ checked, onChange }) {
  return (
    <Track $on={checked} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <Thumb $on={checked} />
    </Track>
  );
}
