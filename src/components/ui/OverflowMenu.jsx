import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  position: relative;
`;

const TriggerButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: #2e2013;
  font-size: 16px;
  line-height: 1;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 140px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  z-index: 5;
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  background: transparent;
  color: ${({ theme, $danger }) => ($danger ? theme.colors.terracotta : '#2e2013')};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.pageBg};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Generic "⋮" trigger + dropdown, closes on outside click, Escape, or after
// picking an item. `items`: [{ label, onClick, danger?, disabled? }].
export function OverflowMenu({ items, ariaLabel = 'More options' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <Wrap ref={wrapRef}>
      <TriggerButton type="button" aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋮
      </TriggerButton>
      {open && (
        <Menu role="menu">
          {items.map((item) => (
            <MenuItem
              key={item.label}
              type="button"
              role="menuitem"
              $danger={item.danger}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </Wrap>
  );
}
