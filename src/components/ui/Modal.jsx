import { useEffect } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 14, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 20;
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 28px;
  max-width: ${({ $wide }) => ($wide ? '640px' : '380px')};
  width: 100%;
  text-align: center;
`;

export function Modal({ onClose, children, wide }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Overlay onClick={onClose}>
      <Panel $wide={wide} onClick={(e) => e.stopPropagation()}>{children}</Panel>
    </Overlay>
  );
}
