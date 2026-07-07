const AVATAR_PALETTE = ['#7C8C4A', '#E3A73E', '#C8592F', '#A25A4A', '#8a8272', '#5c7a8a'];

// Deterministic color assignment so the same user always renders the same
// avatar color across screens, without storing a color field.
export function colorForId(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
