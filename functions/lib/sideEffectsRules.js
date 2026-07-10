import { CARD_DEFS } from './sideEffectsDeck.js';

// Pure Side Effects rules engine — no Admin SDK / Firestore here on purpose,
// mirrors rules.js's separation. functions/lib/sideEffectsHandlers.js is the
// only place that talks to Firestore; it calls into these functions with
// plain data and applies the results.
//
// Psyche entry shape: { disorderId, drugId: string|null, episodeActive:
// 'anorexia'|'depression'|'impotence'|null } — episodeActive drives the
// askew Episode-card overlay on the frontend and is cleared the moment the
// matching restriction is consumed (see sideEffectsHandlers.js#endTurn).

// --- Setup -------------------------------------------------------------

// disorderPile: shuffled array of Disorder cardId strings. Deals
// `psycheSize` disorders to each uid in `turnOrder`, one at a time; any card
// that would duplicate one already dealt to THAT player gets cycled to the
// bottom of the pile and the next card is drawn instead (a Psyche can never
// hold 2 of the same Disorder — per the rulebook's literal dealing
// procedure). Returns { psyches: {uid: [entry]}, leftoverDisorders: [] }.
export function dealPsyches(disorderPile, turnOrder, psycheSize) {
  const pile = [...disorderPile];
  const psyches = {};

  for (const uid of turnOrder) {
    const dealt = [];
    let cycles = 0;
    const maxCycles = pile.length + psycheSize + 1;
    while (dealt.length < psycheSize) {
      if (pile.length === 0) throw new Error('Ran out of Disorder cards while dealing Psyches.');
      const card = pile.shift();
      if (dealt.includes(card)) {
        pile.push(card);
        cycles++;
        if (cycles > maxCycles) throw new Error('Could not deal a duplicate-free Psyche — disorder pool too small.');
        continue;
      }
      dealt.push(card);
    }
    psyches[uid] = dealt.map((disorderId) => ({ disorderId, drugId: null, episodeActive: null }));
  }

  return { psyches, leftoverDisorders: pile };
}

// --- Legality ------------------------------------------------------------

function findEntry(psyche, disorderId) {
  return (psyche || []).find((e) => e.disorderId === disorderId) || null;
}

function hasDisorder(psyche, disorderId) {
  return Boolean(findEntry(psyche, disorderId));
}

// Disorder ids a target is currently "vulnerable" to receiving — the union
// of every active Drug's side-effect list on their Psyche. A player with no
// treated Disorders is vulnerable to nothing.
export function vulnerableDisorders(psyche) {
  const set = new Set();
  for (const entry of psyche || []) {
    if (!entry.drugId) continue;
    for (const sideEffect of CARD_DEFS[entry.drugId].sideEffects) set.add(sideEffect);
  }
  return set;
}

// args: { actionType, hand, cardId, callerUid, targetUid?, targetDisorderId?,
//         ownDisorderId?, handDisorderId?, psyches, restrictions, ruleset }
// Returns { legal: true } or { legal: false, reason: '...' }.
export function isLegalPlay(args) {
  const { actionType, hand, cardId, callerUid, targetUid, targetDisorderId, ownDisorderId, handDisorderId, psyches, restrictions, ruleset } = args;

  if (cardId && !hand.includes(cardId)) return { legal: false, reason: 'CARD_NOT_HELD' };
  if (restrictions?.[callerUid]?.impotence) return { legal: false, reason: 'IMPOTENCE_RESTRICTED' };

  switch (actionType) {
    case 'treat': {
      const def = CARD_DEFS[cardId];
      if (!def || def.type !== 'drug') return { legal: false, reason: 'NOT_A_DRUG' };
      const entry = findEntry(psyches[callerUid], def.treats);
      if (!entry) return { legal: false, reason: 'DISORDER_NOT_IN_PSYCHE' };
      if (entry.drugId) return { legal: false, reason: 'ALREADY_TREATED' };
      return { legal: true };
    }
    case 'giveDisorder': {
      const def = CARD_DEFS[cardId];
      if (!def || def.type !== 'disorder') return { legal: false, reason: 'NOT_A_DISORDER' };
      if (!targetUid || targetUid === callerUid) return { legal: false, reason: 'BAD_TARGET' };
      const targetPsyche = psyches[targetUid] || [];
      if (hasDisorder(targetPsyche, cardId)) return { legal: false, reason: 'ALREADY_HAS_DISORDER' };
      if (!vulnerableDisorders(targetPsyche).has(cardId)) return { legal: false, reason: 'NOT_VULNERABLE' };
      return { legal: true };
    }
    case 'therapy': {
      if (cardId !== 'therapy') return { legal: false, reason: 'NOT_THERAPY' };
      if (!findEntry(psyches[callerUid], ownDisorderId)) return { legal: false, reason: 'DISORDER_NOT_IN_PSYCHE' };
      if (ownDisorderId === 'tremors') return { legal: false, reason: 'TREMORS_IMMUNE_TO_THERAPY' };
      return { legal: true };
    }
    case 'episode': {
      if (cardId !== 'episode') return { legal: false, reason: 'NOT_EPISODE' };
      if (!targetUid || targetUid === callerUid) return { legal: false, reason: 'BAD_TARGET' };
      const entry = findEntry(psyches[targetUid], targetDisorderId);
      if (!entry) return { legal: false, reason: 'DISORDER_NOT_IN_PSYCHE' };
      if (entry.drugId) return { legal: false, reason: 'DISORDER_TREATED' };
      return { legal: true };
    }
    case 'misdiagnosis': {
      if (ruleset !== 'booster') return { legal: false, reason: 'BOOSTER_NOT_ENABLED' };
      if (cardId !== 'misdiagnosis') return { legal: false, reason: 'NOT_MISDIAGNOSIS' };
      if (!findEntry(psyches[callerUid], ownDisorderId)) return { legal: false, reason: 'DISORDER_NOT_IN_PSYCHE' };
      if (!handDisorderId || !hand.includes(handDisorderId)) return { legal: false, reason: 'DISORDER_NOT_IN_HAND' };
      return { legal: true };
    }
    case 'highTolerance': {
      if (ruleset !== 'booster') return { legal: false, reason: 'BOOSTER_NOT_ENABLED' };
      if (cardId !== 'highTolerance') return { legal: false, reason: 'NOT_HIGH_TOLERANCE' };
      if (!targetUid || targetUid === callerUid) return { legal: false, reason: 'BAD_TARGET' };
      const entry = findEntry(psyches[targetUid], targetDisorderId);
      if (!entry || !entry.drugId) return { legal: false, reason: 'NOT_TREATED' };
      return { legal: true };
    }
    default:
      return { legal: false, reason: 'UNKNOWN_ACTION' };
  }
}

// --- Effect resolution -----------------------------------------------------

function clonePsyches(psyches) {
  return Object.fromEntries(Object.entries(psyches).map(([uid, entries]) => [uid, entries.map((e) => ({ ...e }))]));
}

function removeOne(arr, value) {
  const copy = [...arr];
  copy.splice(copy.indexOf(value), 1);
  return copy;
}

function drawNRandom(arr, n, pickRandom) {
  const pool = [...arr];
  const taken = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const card = pickRandom(pool);
    pool.splice(pool.indexOf(card), 1);
    taken.push(card);
  }
  return { taken, remaining: pool };
}

export function applyTreat({ callerUid, cardId, hand, psyches }) {
  const newPsyches = clonePsyches(psyches);
  const def = CARD_DEFS[cardId];
  newPsyches[callerUid].find((e) => e.disorderId === def.treats).drugId = cardId;
  return {
    newPsyches,
    newHand: removeOne(hand, cardId),
    logMessage: `treated their ${CARD_DEFS[def.treats].name} with ${def.name}.`,
  };
}

export function applyGiveDisorder({ targetUid, cardId, hand, psyches }) {
  const newPsyches = clonePsyches(psyches);
  newPsyches[targetUid].push({ disorderId: cardId, drugId: null, episodeActive: null });
  return {
    newPsyches,
    newHand: removeOne(hand, cardId),
    logMessage: `gave {target} ${CARD_DEFS[cardId].name}.`,
  };
}

export function applyTherapy({ callerUid, ownDisorderId, hand, psyches }) {
  const newPsyches = clonePsyches(psyches);
  newPsyches[callerUid] = newPsyches[callerUid].filter((e) => e.disorderId !== ownDisorderId);
  return {
    newPsyches,
    newHand: removeOne(hand, 'therapy'),
    logMessage: `used Therapy to discard ${CARD_DEFS[ownDisorderId].name}.`,
  };
}

// hands: { uid: string[] } for callerUid + targetUid only (the rest of the
// room's hands are never read for an Episode play). pickRandom: (array) =>
// one element, injected for deterministic tests — matches wordyRules.js's
// ctx.pickRandom convention. Returns persistentRestriction (null for the 5
// immediate punishments) for the handler to apply to state.restrictions and
// clear once the target's next turn has enforced it.
export function applyEpisode({ callerUid, targetUid, targetDisorderId, psyches, hands, pickRandom }) {
  const newPsyches = clonePsyches(psyches);
  const newHands = { [callerUid]: [...hands[callerUid]], [targetUid]: [...hands[targetUid]] };
  const entry = newPsyches[targetUid].find((e) => e.disorderId === targetDisorderId);
  let logMessage = '';
  let persistentRestriction = null;

  switch (targetDisorderId) {
    case 'anxiety': {
      const { taken, remaining } = drawNRandom(newHands[targetUid], 1, pickRandom);
      newHands[targetUid] = remaining;
      newHands[callerUid] = [...newHands[callerUid], ...taken];
      logMessage = taken.length
        ? "played Episode on {target}'s Anxiety — took a card from their hand."
        : "played Episode on {target}'s Anxiety — their hand was empty, nothing to take.";
      break;
    }
    case 'gamblingAddiction': {
      const { taken, remaining } = drawNRandom(newHands[targetUid], 3, pickRandom);
      newHands[targetUid] = remaining;
      newHands[callerUid] = [...newHands[callerUid], ...taken];
      logMessage = `played Episode on {target}'s Gambling Addiction — drew ${taken.length} card(s) from their hand.`;
      break;
    }
    case 'madness': {
      const hadAny = newPsyches[targetUid].some((e) => e.drugId);
      for (const e of newPsyches[targetUid]) e.drugId = null;
      logMessage = hadAny
        ? "played Episode on {target}'s Madness — all their treatments were discarded."
        : "played Episode on {target}'s Madness — they had no active treatments.";
      break;
    }
    case 'suicidalThoughts': {
      const count = newHands[targetUid].length;
      newHands[targetUid] = [];
      logMessage = `played Episode on {target}'s Suicidal Thoughts — their entire hand (${count} card(s)) was discarded.`;
      break;
    }
    case 'tremors': {
      const n = Math.min(3, newHands[targetUid].length);
      const { remaining } = drawNRandom(newHands[targetUid], n, pickRandom);
      newHands[targetUid] = remaining;
      logMessage = `played Episode on {target}'s Tremors — ${n} card(s) discarded.`;
      break;
    }
    case 'anorexia':
      persistentRestriction = 'anorexia';
      logMessage = "played Episode on {target}'s Anorexia — {target} won't draw next turn.";
      break;
    case 'depression':
      persistentRestriction = 'depression';
      logMessage = "played Episode on {target}'s Depression — {target} will sit out their next turn.";
      break;
    case 'impotence':
      persistentRestriction = 'impotence';
      logMessage = "played Episode on {target}'s Impotence — {target} won't be able to play next turn.";
      break;
    default:
      throw new Error(`Unknown disorder punishment: ${targetDisorderId}`);
  }

  if (persistentRestriction) entry.episodeActive = persistentRestriction;

  return { newPsyches, newHands, logMessage, persistentRestriction };
}

export function applyMisdiagnosis({ callerUid, ownDisorderId, handDisorderId, hand, psyches }) {
  const newPsyches = clonePsyches(psyches);
  let newHand = removeOne(hand, 'misdiagnosis');
  newHand = removeOne(newHand, handDisorderId);
  newPsyches[callerUid] = newPsyches[callerUid].filter((e) => e.disorderId !== ownDisorderId);
  newPsyches[callerUid].push({ disorderId: handDisorderId, drugId: null, episodeActive: null });
  newHand = [...newHand, ownDisorderId]; // may keep the swapped-out Disorder in hand
  return {
    newPsyches,
    newHand,
    logMessage: `used Misdiagnosis to swap ${CARD_DEFS[ownDisorderId].name} for ${CARD_DEFS[handDisorderId].name}.`,
  };
}

export function applyHighTolerance({ targetUid, targetDisorderId, hand, psyches }) {
  const newPsyches = clonePsyches(psyches);
  newPsyches[targetUid].find((e) => e.disorderId === targetDisorderId).drugId = null;
  return {
    newPsyches,
    newHand: removeOne(hand, 'highTolerance'),
    logMessage: `used High Tolerance on {target}'s ${CARD_DEFS[targetDisorderId].name} — treatment removed.`,
  };
}

// --- Win / turn advance ----------------------------------------------------

export function isPsycheFullyTreated(psyche) {
  return (psyche || []).every((e) => Boolean(e.drugId));
}

export function nextTurnUid(turnOrder, currentUid) {
  const idx = turnOrder.indexOf(currentUid);
  return turnOrder[(idx + 1) % turnOrder.length];
}
