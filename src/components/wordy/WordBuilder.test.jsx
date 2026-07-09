import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { WordBuilder } from './WordBuilder.jsx';

describe('WordBuilder', () => {
  it('starts with all letters in the rack and an empty word', () => {
    const onWordChange = vi.fn();
    render(<WordBuilder letters={['C', 'A', 'B']} onWordChange={onWordChange} />);
    expect(screen.getByText('Drag tiles here…')).toBeInTheDocument();
    expect(onWordChange).toHaveBeenCalledWith('');
  });

  it('clicking a rack tile moves it into the word, in click order', async () => {
    const onWordChange = vi.fn();
    render(<WordBuilder letters={['C', 'A', 'B']} onWordChange={onWordChange} />);

    await userEvent.click(screen.getByText('B'));
    await userEvent.click(screen.getByText('A'));
    await userEvent.click(screen.getByText('C'));

    expect(onWordChange).toHaveBeenLastCalledWith('BAC');
  });

  it('clicking a placed tile moves it back to the rack, updating the word', async () => {
    const onWordChange = vi.fn();
    render(<WordBuilder letters={['C', 'A', 'B']} onWordChange={onWordChange} />);

    await userEvent.click(screen.getByText('C'));
    await userEvent.click(screen.getByText('A'));
    expect(onWordChange).toHaveBeenLastCalledWith('CA');

    // The "C" tile is now rendered in the word row — clicking it again
    // sends it back to the rack.
    await userEvent.click(screen.getByText('C'));
    expect(onWordChange).toHaveBeenLastCalledWith('A');
  });

  it('keeps duplicate letters as distinct tiles', async () => {
    const onWordChange = vi.fn();
    render(<WordBuilder letters={['L', 'L', 'A']} onWordChange={onWordChange} />);

    const ls = screen.getAllByText('L');
    expect(ls).toHaveLength(2);
    await userEvent.click(ls[0]);
    await userEvent.click(screen.getByText('A'));
    await userEvent.click(screen.getAllByText('L')[0]); // the remaining rack "L"

    expect(onWordChange).toHaveBeenLastCalledWith('LAL');
  });

  it('does not move tiles when disabled', async () => {
    const onWordChange = vi.fn();
    render(<WordBuilder letters={['C', 'A', 'B']} onWordChange={onWordChange} disabled />);

    await userEvent.click(screen.getByText('C'));
    expect(onWordChange).toHaveBeenLastCalledWith('');
  });
});
