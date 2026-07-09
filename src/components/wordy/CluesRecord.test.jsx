import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { CluesRecord } from './CluesRecord.jsx';

const entries = [
  { id: '1', kind: 'clue', clueId: 'last-letter', activatorUid: 'me', aboutUid: 'opp', message: 'Me activated Last Letter — ends in "B".', createdAt: null },
  { id: '2', kind: 'guess', guesserUid: 'opp', aboutUid: 'me', correct: false, guess: 'DOG', message: 'Opp guessed wrong.', createdAt: null },
  { id: '3', kind: 'clue', clueId: 'vowel-count', activatorUid: 'opp', aboutUid: 'me', message: 'Opp activated Vowel Count — 2 vowels.', createdAt: null },
  { id: '4', kind: 'guess', guesserUid: 'me', aboutUid: 'opp', correct: true, guess: 'CAB', message: 'Me correctly guessed.', createdAt: null },
  { id: '5', message: 'Tiles dealt — build your Secret Word!', createdAt: null }, // no kind — a system line
];

describe('CluesRecord', () => {
  it('defaults to "Their Word" view, showing only entries the viewer gathered about the opponent', () => {
    render(<CluesRecord entries={entries} viewerUid="me" opponentUid="opp" myWord="PLAN" />);
    expect(screen.getByText('Last Letter')).toBeInTheDocument();
    expect(screen.getByText('"CAB"')).toBeInTheDocument();
    expect(screen.queryByText('Vowel Count')).not.toBeInTheDocument();
    expect(screen.queryByText('"DOG"')).not.toBeInTheDocument();
    expect(screen.queryByText(/Your word:/)).not.toBeInTheDocument();
  });

  it('toggling to "My Word" shows only opponent-gathered entries and the viewer\'s own word', async () => {
    render(<CluesRecord entries={entries} viewerUid="me" opponentUid="opp" myWord="PLAN" />);
    await userEvent.click(screen.getByText('My Word'));

    expect(screen.getByText('Your word: PLAN')).toBeInTheDocument();
    expect(screen.getByText('Vowel Count')).toBeInTheDocument();
    expect(screen.getByText('"DOG"')).toBeInTheDocument();
    expect(screen.queryByText('Last Letter')).not.toBeInTheDocument();
    expect(screen.queryByText('"CAB"')).not.toBeInTheDocument();
  });

  it('shows an empty state when there is nothing to show in a view', () => {
    render(<CluesRecord entries={[]} viewerUid="me" opponentUid="opp" myWord="PLAN" />);
    expect(screen.getByText(/Nothing gathered/)).toBeInTheDocument();
  });
});
