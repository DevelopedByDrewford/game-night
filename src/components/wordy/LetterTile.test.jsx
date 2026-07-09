import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { LetterTile } from './LetterTile.jsx';

describe('LetterTile', () => {
  it('renders the letter', () => {
    render(<LetterTile letter="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('hides the letter when face-down', () => {
    render(<LetterTile letter="A" faceDown />);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('renders as a plain div (not a button) when no onClick is passed', () => {
    render(<LetterTile letter="A" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a clickable button and fires onClick when passed', async () => {
    const onClick = vi.fn();
    render(<LetterTile letter="A" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
