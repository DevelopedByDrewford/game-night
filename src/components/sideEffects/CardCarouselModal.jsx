import { useEffect, useState } from 'react';
import './CardCarouselModal.css';

// Above this viewport width, a Psyche's usual 4 cards (or a hand up to 6)
// comfortably fit in one row — skip the slider/peek mechanism entirely and
// just show every card at once. Narrower viewports, or more cards than
// that, fall back to the one-at-a-time swipeable stage below.
const GRID_MIN_WIDTH = 900;
const GRID_MAX_ITEMS = 6;

function useIsWideViewport(breakpoint) {
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= breakpoint);

  useEffect(() => {
    function handleResize() {
      setIsWide(window.innerWidth >= breakpoint);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isWide;
}

// Fullscreen card viewer for a Psyche or a hand. On a wide-enough desktop
// viewport with few enough cards, renders every card side by side (grid
// mode) — no slider needed. Otherwise, swipe/arrow through one at a time,
// enlarged, with neighboring cards "peeking" in from the sides (dimmed,
// partially cut off by the stage's overflow:hidden) so it still reads as a
// row of cards sitting next to each other. `renderCard(item, index)` draws
// the actual card content so this stays agnostic to whether `items` are
// hand cardIds or Psyche entries; `renderDescription`/`renderActions` are
// optional per-card render-props shown beneath the card(s) either way.
export function CardCarouselModal({ items, startIndex = 0, onClose, renderCard, renderDescription, renderActions, title }) {
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, items.length - 1)));
  const [touchStartX, setTouchStartX] = useState(null);
  const isWide = useIsWideViewport(GRID_MIN_WIDTH);
  const showGrid = isWide && items.length > 1 && items.length <= GRID_MAX_ITEMS;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(items.length - 1, i + 1));

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  if (!items.length) return null;

  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta > 50) goPrev();
    else if (delta < -50) goNext();
    setTouchStartX(null);
  }

  if (showGrid) {
    return (
      <div className="card-carousel-backdrop" onClick={onClose}>
        <div className="card-carousel" onClick={(e) => e.stopPropagation()}>
          <button className="card-carousel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
          {title && <div className="card-carousel__title">{title}</div>}

          <div className="card-carousel__grid">
            {items.map((item, i) => (
              <div className="card-carousel__grid-item" key={i}>
                {renderCard(item, i)}
                {renderDescription && <div className="card-carousel__description">{renderDescription(item, i)}</div>}
                {renderActions && <div className="card-carousel__actions">{renderActions(item, i)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const current = items[index];
  const prev = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;

  return (
    <div className="card-carousel-backdrop" onClick={onClose}>
      <div
        className="card-carousel"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button className="card-carousel__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {title && <div className="card-carousel__title">{title}</div>}
        <div className="card-carousel__progress">
          {index + 1} / {items.length}
        </div>

        <div className="card-carousel__stage">
          <button
            className="card-carousel__peek card-carousel__peek--prev"
            onClick={goPrev}
            disabled={!prev}
            aria-label="Previous card"
          >
            {prev && <div className="card-carousel__peek-card">{renderCard(prev, index - 1)}</div>}
          </button>

          <div className="card-carousel__current">{renderCard(current, index)}</div>

          <button
            className="card-carousel__peek card-carousel__peek--next"
            onClick={goNext}
            disabled={!next}
            aria-label="Next card"
          >
            {next && <div className="card-carousel__peek-card">{renderCard(next, index + 1)}</div>}
          </button>
        </div>

        {renderDescription && <div className="card-carousel__description">{renderDescription(current, index)}</div>}
        {renderActions && <div className="card-carousel__actions">{renderActions(current, index)}</div>}
      </div>
    </div>
  );
}
