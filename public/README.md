# Game Night — Favicon Package

## What's in here
- `favicon.ico` — multi-resolution (16/32/48px), the universal fallback nearly every
  browser still checks for automatically.
- `favicon-16x16.png`, `favicon-32x32.png` — modern browser tab icons (Chrome, Firefox, Edge).
- `apple-touch-icon.png` (180×180) — used by Safari iOS/iPadOS when someone adds the
  site to their home screen, and by Safari desktop in some contexts.
- `android-chrome-192x192.png`, `android-chrome-512x512.png` — used by Chrome on
  Android for home-screen shortcuts and PWA install prompts.
- `safari-pinned-tab.svg` — a monochrome silhouette version, required specifically by
  Safari's "pinned tab" / mask-icon feature (Safari recolors this itself, so it must
  stay a single flat color with a transparent background — don't swap in the colored
  version here).
- `site.webmanifest` — tells Android Chrome/PWA installs the app name and which icons
  to use.

## Design notes
- The mark is the ziggurat (stepped pyramid) from the exploration file, rendered on a
  dark rounded-square backing (`#2A1D12`, matching the "ink" tone from the palette) so
  it stays legible on both light and dark browser tab bars.
- For legibility at 16–32px, the fourth step's faded opacity (from the original CSS)
  was made fully solid — the opacity fade reads fine at mockup size but disappears
  into muddiness at favicon size, so this version keeps all four steps at full color.
- If you'd rather have the ribbon-wave or Venn-cluster mark as the favicon instead,
  the same pipeline (SVG → PNG at each size → .ico) applies — just say which one and
  I'll regenerate the set.
