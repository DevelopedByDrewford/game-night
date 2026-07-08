import { cardValue } from './deck.js';

// Pure Love Letter rules engine — no Admin SDK / Firestore here on purpose,
// so it's unit-testable with plain vitest. functions/index.js is the only
// place that talks to Firestore; it calls into these functions with plain
// data and applies the results.

// --- Setup -----------------------------------------------------------------

// shuffledDeck: array of cardId strings, already shuffled.
export function dealSetup(shuffledDeck, playerCount) {
  const reserveCard = shuffledDeck[0];
  if (playerCount === 2) {
    return {
      reserveCard,
      setAsideVisible: shuffledDeck.slice(1, 4),
      drawPile: shuffledDeck.slice(4),
    };
  }
  return { reserveCard, setAsideVisible: [], drawPile: shuffledDeck.slice(1) };
}

// --- Legality ----------------------------------------------------------------

export function isCountessForced(hand) {
  return hand.includes('countess') && (hand.includes('king') || hand.includes('prince'));
}

// Uids a card could legally target, given who's alive/protected. Guard/
// Priest/Baron/King must target someone else who isn't protected; Prince
// may always target self in addition to that, so it's never empty.
export function legalTargets(cardId, callerUid, aliveUids, protectedUids) {
  const others = aliveUids.filter((uid) => uid !== callerUid && !protectedUids.includes(uid));
  if (cardId === 'prince') return [...others, callerUid];
  if (cardId === 'guard' || cardId === 'priest' || cardId === 'baron' || cardId === 'king') return others;
  return [];
}

// hand: this player's current 2 cards. Returns { legal: true } or
// { legal: false, reason: 'ILLEGAL_COUNTESS' | 'CARD_NOT_HELD' | 'BAD_TARGET' | 'BAD_GUESS' }.
export function isLegalPlay({ hand, cardId, targetUid, guessCardId, callerUid, aliveUids, protectedUids }) {
  if (!hand.includes(cardId)) return { legal: false, reason: 'CARD_NOT_HELD' };
  if ((cardId === 'king' || cardId === 'prince') && isCountessForced(hand)) {
    return { legal: false, reason: 'ILLEGAL_COUNTESS' };
  }

  const targets = legalTargets(cardId, callerUid, aliveUids, protectedUids);
  const needsTarget = ['guard', 'priest', 'baron', 'king', 'prince'].includes(cardId);

  if (needsTarget) {
    if (targets.length === 0) {
      // Fizzle case (only possible for guard/priest/baron/king — prince always has self).
      if (targetUid) return { legal: false, reason: 'BAD_TARGET' };
    } else if (!targetUid || !targets.includes(targetUid)) {
      return { legal: false, reason: 'BAD_TARGET' };
    }
  } else if (targetUid) {
    return { legal: false, reason: 'BAD_TARGET' };
  }

  if (cardId === 'guard' && targetUid) {
    if (!guessCardId || guessCardId === 'guard') return { legal: false, reason: 'BAD_GUESS' };
  }

  return { legal: true };
}

// --- Effect resolution -------------------------------------------------------

// hands: { uid: string[] } — callerUid has 2 cards (about to play cardId),
// every other alive uid has exactly 1. Returns a new hands object (input
// untouched) plus a description of side effects for the caller (index.js)
// to apply — eliminations, protection, a pending redraw, a private peek,
// and a public log line that never contains hidden info (Priest's peek,
// King's swap contents).
export function applyCardEffect({ cardId, callerUid, targetUid, guessCardId, hands }) {
  const newHands = Object.fromEntries(Object.entries(hands).map(([uid, cards]) => [uid, [...cards]]));
  const callerIdx = newHands[callerUid].indexOf(cardId);
  newHands[callerUid].splice(callerIdx, 1);

  const result = {
    newHands,
    eliminatedUids: [],
    protectUid: null,
    needsRedrawUid: null,
    peek: null,
    logMessage: '',
  };

  const eliminate = (uid) => {
    newHands[uid] = [];
    result.eliminatedUids.push(uid);
  };

  switch (cardId) {
    case 'guard': {
      if (!targetUid) {
        result.logMessage = 'played Guard — no legal target, no effect.';
        break;
      }
      const targetCard = newHands[targetUid][0];
      if (targetCard === guessCardId) {
        eliminate(targetUid);
        result.logMessage = `played Guard on {target}, guessed ${guessCardId} — correct! {target} is out.`;
      } else {
        result.logMessage = `played Guard on {target}, guessed ${guessCardId} — wrong.`;
      }
      break;
    }
    case 'priest': {
      if (!targetUid) {
        result.logMessage = 'played Priest — no legal target, no effect.';
        break;
      }
      result.peek = { viewerUid: callerUid, targetUid, card: newHands[targetUid][0] };
      result.logMessage = 'played Priest on {target}.';
      break;
    }
    case 'baron': {
      if (!targetUid) {
        result.logMessage = 'played Baron — no legal target, no effect.';
        break;
      }
      const callerCard = newHands[callerUid][0];
      const targetCard = newHands[targetUid][0];
      if (cardValue(callerCard) === cardValue(targetCard)) {
        result.logMessage = `played Baron on {target} — both held ${cardValue(callerCard)}s, no effect.`;
      } else if (cardValue(callerCard) < cardValue(targetCard)) {
        eliminate(callerUid);
        result.logMessage = `played Baron on {target} — lost the compare (${callerCard} vs ${targetCard}), is out.`;
      } else {
        eliminate(targetUid);
        result.logMessage = `played Baron on {target} — won the compare (${callerCard} vs ${targetCard}), {target} is out.`;
      }
      break;
    }
    case 'handmaid': {
      result.protectUid = callerUid;
      result.logMessage = 'played Handmaid — protected until their next turn.';
      break;
    }
    case 'prince': {
      const discarded = newHands[targetUid][0];
      newHands[targetUid] = [];
      if (discarded === 'princess') {
        result.eliminatedUids.push(targetUid);
        result.logMessage = 'played Prince on {target} — discarded the Princess and is out!';
      } else {
        result.needsRedrawUid = targetUid;
        result.logMessage = 'played Prince on {target} — discarded and drew a new card.';
      }
      break;
    }
    case 'king': {
      if (!targetUid) {
        result.logMessage = 'played King — no legal target, no effect.';
        break;
      }
      const callerCard = newHands[callerUid][0];
      newHands[callerUid][0] = newHands[targetUid][0];
      newHands[targetUid][0] = callerCard;
      result.logMessage = 'played King — traded hands with {target}.';
      break;
    }
    case 'countess': {
      result.logMessage = 'played Countess.';
      break;
    }
    case 'princess': {
      eliminate(callerUid);
      result.logMessage = 'played the Princess — out!';
      break;
    }
    case 'spy': {
      result.logMessage = 'played Spy.';
      break;
    }
    case 'chancellor': {
      // No effect here — Chancellor needs deck access (draw 2, choose 1 to
      // keep) that this pure hands-only function doesn't have. handlers.js
      // special-cases it right after calling this, using this log line as
      // the base and appending nothing else in the fizzle (no-cards-left) case.
      result.logMessage = 'played Chancellor.';
      break;
    }
    default:
      throw new Error(`Unknown cardId: ${cardId}`);
  }

  return result;
}

// --- Round end ---------------------------------------------------------------

// Spy's end-of-round bonus: among players still alive when the round ends,
// find whoever is the ONLY one with a Spy in their discard pile (dedup by
// uid, not by card count — discarding two Spies yourself still only ever
// produces one qualifying uid). Returns that uid, or null if zero or 2+
// players qualify.
export function spyBonusUid(aliveUids, discardPiles) {
  const qualifying = aliveUids.filter((uid) => (discardPiles[uid] || []).includes('spy'));
  return qualifying.length === 1 ? qualifying[0] : null;
}

export function pickRoundWinners(aliveUids, hands, discardPiles) {
  if (aliveUids.length === 1) return aliveUids;

  const bestValue = Math.max(...aliveUids.map((uid) => cardValue(hands[uid][0])));
  const highHandUids = aliveUids.filter((uid) => cardValue(hands[uid][0]) === bestValue);
  if (highHandUids.length === 1) return highHandUids;

  const discardSum = (uid) => (discardPiles[uid] || []).reduce((sum, c) => sum + cardValue(c), 0);
  const bestSum = Math.max(...highHandUids.map(discardSum));
  return highHandUids.filter((uid) => discardSum(uid) === bestSum);
}

export function nextActiveUid(turnOrder, currentUid, eliminatedUids) {
  const eliminated = new Set(eliminatedUids);
  const startIdx = turnOrder.indexOf(currentUid);
  for (let step = 1; step <= turnOrder.length; step++) {
    const candidate = turnOrder[(startIdx + step) % turnOrder.length];
    if (!eliminated.has(candidate)) return candidate;
  }
  return null;
}
