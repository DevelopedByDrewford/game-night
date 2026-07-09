import { useEffect, useState } from 'react';
import { LetterTile } from './LetterTile.jsx';
import './WordBuilder.css';

// Drag-and-drop (or click, as a fallback for touch/no-JS-drag environments)
// tile rack for building a word: `letters` are the player's available tiles
// (rack), tiles dragged/clicked into the "word" row form the word, reported
// via onWordChange(word) as a plain string. Rack order is purely a thinking
// aid (drag to rearrange while you look for anagrams) and isn't reported
// anywhere — only the word row's order matters. Mount with a fresh `key`
// prop to reset back to an empty word row (e.g. after a successful submit).
export function WordBuilder({ letters, onWordChange, disabled = false, tileSize = 44 }) {
  const [tiles, setTiles] = useState(() => ({
    rack: letters.map((letter, i) => ({ id: `t${i}`, letter })),
    word: [],
  }));

  useEffect(() => {
    onWordChange(tiles.word.map((t) => t.letter).join(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.word]);

  function moveTile(fromArea, fromIndex, toArea, toIndexRaw) {
    if (disabled) return;
    setTiles((prev) => {
      const fromList = [...prev[fromArea]];
      const [moved] = fromList.splice(fromIndex, 1);
      if (!moved) return prev;
      const toList = fromArea === toArea ? fromList : [...prev[toArea]];
      const toIndex = Math.min(toIndexRaw, toList.length);
      toList.splice(toIndex, 0, moved);
      return { ...prev, [fromArea]: fromList, [toArea]: toList };
    });
  }

  function handleDragStart(e, area, index) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ area, index }));
  }

  function readDragPayload(e) {
    try {
      return JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return null;
    }
  }

  function handleDropOnTile(e, toArea, toIndex) {
    e.preventDefault();
    e.stopPropagation();
    const payload = readDragPayload(e);
    if (!payload) return;
    moveTile(payload.area, payload.index, toArea, toIndex);
  }

  function handleDropOnRow(e, toArea) {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload) return;
    moveTile(payload.area, payload.index, toArea, tiles[toArea].length);
  }

  return (
    <div className="word-builder">
      <div className="word-builder__label">Your tiles — drag to reorder, or drag/click into your word</div>
      <div
        className="word-builder__row word-builder__row--rack"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropOnRow(e, 'rack')}
      >
        {tiles.rack.map((tile, i) => (
          <LetterTile
            key={tile.id}
            letter={tile.letter}
            size={tileSize}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, 'rack', i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnTile(e, 'rack', i)}
            onClick={() => moveTile('rack', i, 'word', tiles.word.length)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="word-builder__label">Your word</div>
      <div
        className="word-builder__row word-builder__row--word"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropOnRow(e, 'word')}
      >
        {tiles.word.length === 0 && <div className="word-builder__placeholder">Drag tiles here…</div>}
        {tiles.word.map((tile, i) => (
          <LetterTile
            key={tile.id}
            letter={tile.letter}
            size={tileSize}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, 'word', i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnTile(e, 'word', i)}
            onClick={() => moveTile('word', i, 'rack', tiles.rack.length)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
