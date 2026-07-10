import { useEffect, useState } from 'react';
import './CardCarouselModal.css';

// Layout constants — kept in sync with the modal's own CSS (.card-carousel__grid's
// gap, .card-carousel's padding, .card-carousel__description's max-width) so
// the "how many cards fit" math is measuring the same box the browser will
// actually lay out.
const GRID_GAP = 32;
const GRID_SIDE_PADDING = 48; // .card-carousel's 24px padding, both sides
const NAV_BUTTON_RESERVE = 120; // conservative space for the prev/next page-nav buttons when paging
// A grid-item's actual footprint is whichever is wider, the card itself or
// its description block underneath (description text is often wider than a
// narrow card) — .card-carousel__grid-item centers its children, so the
// widest one determines the column's real width.
const DESCRIPTION_MAX_WIDTH = 260;

// Below this width we're in the app's usual mobile layout — same breakpoint
// used everywhere else (PageWrap, NavBar, table layouts). Above it, this is
// "desktop" and should never drop to the mobile single-card peek-slider,
// even if not every card fits at once — see computeItemsPerPage.
const MOBILE_BREAKPOINT = 640;

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 0));

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

// How many cards fit side by side in one row at this viewport width —
// reserves room for the page-nav arrows up front so the count doesn't
// change depending on whether paging ends up being needed.
function computeItemsPerPage(viewportWidth, itemWidth) {
  const available = viewportWidth - GRID_SIDE_PADDING - NAV_BUTTON_RESERVE;
  const perPage = Math.floor((available + GRID_GAP) / (itemWidth + GRID_GAP));
  return Math.max(1, perPage);
}

// Fullscreen card viewer for a Psyche or a hand.
//
// - Desktop (>= MOBILE_BREAKPOINT): always shows as many full-size cards at
//   once as actually fit the viewport — every card if they all fit, or a
//   page of them with Prev/Next paging otherwise. Never falls back to the
//   1-at-a-time mobile slider; Psyches can grow past their starting 3-4
//   (via Give a Disorder) up to 7-8, and hands vary too, so this is a real
//   fit computation against `cardWidth`, not a fixed item-count cutoff.
// - Mobile (< MOBILE_BREAKPOINT): the classic 1-at-a-time swipeable slider,
//   with neighboring cards "peeking" in from the sides (dimmed, partially
//   cut off by the stage's overflow:hidden) so it still reads as a row of
//   cards sitting next to each other — unchanged, and deliberately a
//   different UI than desktop's paged grid.
//
// `renderCard(item, index)` draws the actual card content so this stays
// agnostic to whether `items` are hand cardIds or Psyche entries;
// `renderDescription`/`renderActions` are optional per-card render-props
// shown beneath the card(s) either way.
export function CardCarouselModal({ items, startIndex = 0, onClose, renderCard, renderDescription, renderActions, title, cardWidth = 220 }) {
  const [touchStartX, setTouchStartX] = useState(null);
  const viewportWidth = useViewportWidth();

  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  // Only reserve room for the wider description column when one is
  // actually being rendered.
  const itemWidth = renderDescription ? Math.max(cardWidth, DESCRIPTION_MAX_WIDTH) : cardWidth;
  const itemsPerPage = isMobile ? 1 : Math.min(items.length, computeItemsPerPage(viewportWidth, itemWidth));

  const [index, setIndex] = useState(() => {
    const clampedStart = Math.min(startIndex, Math.max(0, items.length - 1));
    return isMobile ? clampedStart : Math.floor(clampedStart / itemsPerPage) * itemsPerPage;
  });

  const maxStartIndex = Math.max(0, items.length - itemsPerPage);
  const goPrev = () => setIndex((i) => Math.max(0, i - itemsPerPage));
  const goNext = () => setIndex((i) => Math.min(maxStartIndex, i + itemsPerPage));

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, itemsPerPage, maxStartIndex]);

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

  if (!isMobile) {
    const pageItems = items.slice(index, index + itemsPerPage);
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const currentPage = Math.floor(index / itemsPerPage) + 1;
    const paged = totalPages > 1;

    return (
      <div className="card-carousel-backdrop" onClick={onClose}>
        <div className="card-carousel" onClick={(e) => e.stopPropagation()}>
          <button className="card-carousel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
          {title && <div className="card-carousel__title">{title}</div>}
          {paged && (
            <div className="card-carousel__progress">
              {currentPage} / {totalPages}
            </div>
          )}

          <div className="card-carousel__paged-row">
            {paged && (
              <button
                className="card-carousel__page-nav card-carousel__page-nav--prev"
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Previous cards"
              >
                ‹
              </button>
            )}

            <div className="card-carousel__grid">
              {pageItems.map((item, i) => {
                const actualIndex = index + i;
                return (
                  <div className="card-carousel__grid-item" key={actualIndex}>
                    {renderCard(item, actualIndex)}
                    {renderDescription && (
                      <div className="card-carousel__description card-carousel__description--fixed">
                        {renderDescription(item, actualIndex)}
                      </div>
                    )}
                    {renderActions && <div className="card-carousel__actions">{renderActions(item, actualIndex)}</div>}
                  </div>
                );
              })}
            </div>

            {paged && (
              <button
                className="card-carousel__page-nav card-carousel__page-nav--next"
                onClick={goNext}
                disabled={index >= maxStartIndex}
                aria-label="Next cards"
              >
                ›
              </button>
            )}
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
