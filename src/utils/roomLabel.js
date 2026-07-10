// Room "name" is optional and doesn't need to be unique — the invite code
// is what actually identifies/joins a room. Every display surface (dashboard
// cards, lobby/table headers, activity feed) should go through this so a
// named room shows its name everywhere at once, falling back to the invite
// code exactly like before this feature existed. Frontend copy of
// functions/lib/push.js's roomLabel — duplicated for the same reason as
// utils/cards.js (functions/ is a separate deployable).
export function roomLabel({ name, code } = {}) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Room ${code || ''}`;
}
