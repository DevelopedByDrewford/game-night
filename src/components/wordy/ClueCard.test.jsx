import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { ClueCard } from './ClueCard.jsx';

describe('ClueCard', () => {
  it('renders title, category, and numeric value', () => {
    render(<ClueCard title="Last Letter" category="vanilla" value={1} />);
    expect(screen.getByText('Last Letter')).toBeInTheDocument();
    expect(screen.getByText('Vanilla')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it("renders a '?' for a dynamic (null) value", () => {
    render(<ClueCard title="Dynamic Word Builder" category="spicy" value={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('fires onClick when clickable and not disabled', async () => {
    const onClick = vi.fn();
    render(<ClueCard title="Rare Find" category="spicy" value={1} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<ClueCard title="Rare Find" category="spicy" value={1} onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
