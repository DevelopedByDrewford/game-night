// "Worn board-game box" look for Catalog cards, ported from the design
// handoff's boxVariants/wearClipPaths tables — 4 preset "personalities"
// (asymmetric radius, cardboard/edge colors, and a worn corner) cycled by
// index so a shelf of games reads as distinct boxes pulled off a shelf, not
// one card copy-pasted. The handoff's per-variant tilt and paper-grain
// texture overlay were both dropped per feedback — everything else stayed.
const BOX_VARIANTS = [
  {
    radius: '15px 20px 9px 17px',
    shellBg: '#F0E3C2',
    edgeBg: '#CDB98C',
    wearCorner: 'tr',
    wearSize: '34px',
    shadow: '0 12px 26px rgba(46,32,19,.16), 0 2px 0 rgba(46,32,19,.08)',
  },
  {
    radius: '10px 14px 19px 12px',
    shellBg: '#EAD9AE',
    edgeBg: '#B9A277',
    wearCorner: 'bl',
    wearSize: '42px',
    shadow: '0 14px 30px rgba(46,32,19,.18), 0 2px 0 rgba(46,32,19,.1)',
  },
  {
    radius: '19px 11px 14px 8px',
    shellBg: '#F2E6C8',
    edgeBg: '#D6C296',
    wearCorner: 'br',
    wearSize: '24px',
    shadow: '0 10px 22px rgba(46,32,19,.14), 0 2px 0 rgba(46,32,19,.07)',
  },
  {
    radius: '8px 18px 12px 21px',
    shellBg: '#E4D0A0',
    edgeBg: '#A88F60',
    wearCorner: 'tl',
    wearSize: '48px',
    shadow: '0 16px 32px rgba(46,32,19,.2), 0 2px 0 rgba(46,32,19,.12)',
  },
];

const WEAR_CLIP_PATHS = {
  tl: { pos: { top: 0, left: 0 }, clip: 'polygon(0 0, 100% 0, 0 100%)' },
  tr: { pos: { top: 0, right: 0 }, clip: 'polygon(100% 0, 0 0, 100% 100%)' },
  bl: { pos: { bottom: 0, left: 0 }, clip: 'polygon(0 100%, 0 0, 100% 100%)' },
  br: { pos: { bottom: 0, right: 0 }, clip: 'polygon(100% 100%, 100% 0, 0 100%)' },
};

// Extend BOX_VARIANTS with a 5th/6th entry later to add more personalities
// — everything else here just cycles by index.
export function boxVariant(index) {
  const v = BOX_VARIANTS[index % BOX_VARIANTS.length];
  const wc = WEAR_CLIP_PATHS[v.wearCorner];
  return {
    radius: v.radius,
    shellBg: v.shellBg,
    edgeBg: v.edgeBg,
    borderColor: 'rgba(46,32,19,.18)',
    shadow: v.shadow,
    wearSize: v.wearSize,
    wearPos: wc.pos,
    wearClip: wc.clip,
    wearColor: `${v.edgeBg}99`,
  };
}
