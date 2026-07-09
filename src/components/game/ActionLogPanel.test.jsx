import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActionLogPanel } from './ActionLogPanel.jsx';

describe('ActionLogPanel', () => {
  it('renders entries most-recent-first even though they arrive oldest-first', () => {
    const entries = [
      { id: '1', seq: 0, message: 'Round 1 dealt.', createdAt: null },
      { id: '2', seq: 1, message: 'Me played Guard on Opp — wrong.', createdAt: null },
      { id: '3', seq: 2, message: 'Opp played Priest on Me.', createdAt: null },
    ];

    render(<ActionLogPanel entries={entries} />);

    const rendered = screen.getAllByText(/Round 1 dealt\.|played Guard|played Priest/);
    expect(rendered.map((el) => el.textContent)).toEqual([
      'Opp played Priest on Me.',
      'Me played Guard on Opp — wrong.',
      'Round 1 dealt.',
    ]);
  });

  it('does not mutate the original entries array', () => {
    const entries = [
      { id: '1', seq: 0, message: 'First', createdAt: null },
      { id: '2', seq: 1, message: 'Second', createdAt: null },
    ];

    render(<ActionLogPanel entries={entries} />);

    expect(entries.map((e) => e.id)).toEqual(['1', '2']);
  });
});
