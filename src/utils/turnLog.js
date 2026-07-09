import { CARD_ORDER, CARD_DEFS } from './cards.js';

// Every per-card logMessage template in functions/lib/rules.js is built as
// `${playerName} ${effect.logMessage}`, and effect.logMessage always
// capitalizes the card that was actually played (any *guessed* card id is
// interpolated lowercase, e.g. "guessed priest") — so the first capitalized
// card name in the sentence is reliably the card that was played. No card
// name is a substring of another, so a simple word-boundary match is safe.
const CARD_NAME_RE = new RegExp(`\\b(${CARD_ORDER.map((id) => CARD_DEFS[id].name).join('|')})\\b`);

// Turns a raw gameRooms/{roomId}/log entry (`{ seq, message, roundNumber }`)
// into either a `turn` (a card was played — has an actor + card to show big)
// or an `announcement` (round dealt / round or game won — no single actor
// or card, shown as plain text) for TurnReviewOverlay to render.
export function parseLogEntry(entry, room, viewerUid) {
  const { message } = entry;
  const actor = room.players.find((p) => message.startsWith(`${p.displayName} `));
  const cardMatch = message.match(CARD_NAME_RE);
  const cardId = cardMatch ? CARD_ORDER.find((id) => CARD_DEFS[id].name === cardMatch[1]) : null;

  if (!actor || !cardId) {
    return { id: entry.id, seq: entry.seq, kind: 'announcement', message };
  }

  const isYou = actor.uid === viewerUid;
  const actorLabel = isYou ? 'You' : actor.displayName;
  const rest = message.slice(actor.displayName.length); // " played Guard on Amy, guessed priest — wrong."
  const cardName = cardMatch[1];
  const cardIdx = rest.indexOf(cardName);

  return {
    id: entry.id,
    seq: entry.seq,
    kind: 'turn',
    actorUid: actor.uid,
    actorLabel,
    cardId,
    before: `${actorLabel}${rest.slice(0, cardIdx)}`,
    cardName,
    after: rest.slice(cardIdx + cardName.length),
  };
}
