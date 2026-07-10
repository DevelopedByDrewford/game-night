import { isValidWord } from './dictionary.js';

// Pure A Little Wordy rules engine — no Admin SDK/Firestore here on
// purpose (mirrors functions/lib/rules.js's Love Letter engine), so it's
// unit-testable with plain vitest. functions/lib/wordyHandlers.js is the
// only place that talks to Firestore; it calls into these functions with
// plain data and applies the results.
//
// Effect text for each clue below is NOT re-stated here beyond what's
// needed to compute it — docs/a-little-wordy-rules.md's Clue table is the
// authoritative source. "rhyme-time" has no resolver in this file — it
// needs the opponent to supply a word in the moment (no server-side rhyme
// generation), so it's handled as a separate pending-response flow in
// wordyHandlers.js instead of the single-call pattern every other clue uses.

const VOWEL_LETTERS = new Set(['A', 'E', 'I', 'O', 'U']);
const RARE_LETTERS = ['Z', 'J', 'Q', 'X', 'K'];

function isVowel(ch) {
  return VOWEL_LETTERS.has(ch.toUpperCase());
}

function tileMultiset(tiles) {
  const counts = {};
  for (const letter of [...tiles.vowels, ...tiles.consonants]) {
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

// Can `word` be built from `tiles` ({vowels, consonants})? Respects
// duplicate-letter counts (e.g. needing two E's requires two E tiles).
export function isSpellable(word, tiles) {
  const available = tileMultiset(tiles);
  const needed = {};
  for (const ch of word.toUpperCase()) needed[ch] = (needed[ch] || 0) + 1;
  return Object.entries(needed).every(([letter, count]) => (available[letter] || 0) >= count);
}

function countOccurrences(word, letter) {
  return word.toUpperCase().split('').filter((ch) => ch === letter.toUpperCase()).length;
}

// Positions in `word` not already in `revealedPositions`, optionally
// filtered (e.g. Buy a Vowel only wants vowel positions).
function unrevealedPositions(word, revealedPositions, predicate = () => true) {
  const revealed = new Set(revealedPositions);
  const out = [];
  for (let i = 0; i < word.length; i++) {
    if (!revealed.has(i) && predicate(word[i])) out.push(i);
  }
  return out;
}

// Word Builder / Dynamic Word Builder: walk `builtWord` left to right,
// "using up" one occurrence of each letter from `secretWord`'s pool as we
// go — this is what makes duplicate letters counted separately (a second
// "E" in builtWord only counts as present if secretWord has a second "E").
function flipAgainstSecretWord(builtWord, secretWord) {
  const remaining = {};
  for (const ch of secretWord.toUpperCase()) remaining[ch] = (remaining[ch] || 0) + 1;
  return builtWord
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (remaining[ch] > 0) {
        remaining[ch] -= 1;
        return { letter: ch, present: true };
      }
      return { letter: ch, present: false };
    });
}

function requireBuiltWord(ctx) {
  const built = ctx.args.builtWord;
  if (!built || !isSpellable(built, ctx.callerHand.tilesInFront) || !isValidWord(built)) {
    throw new Error("That word can't be built from your tiles, or isn't a real word.");
  }
  return built;
}

function requireLetterInCallerTiles(ctx) {
  const letter = (ctx.args.letter || '').toUpperCase();
  if (!tileMultiset(ctx.callerHand.tilesInFront)[letter]) {
    throw new Error("That letter isn't in your tile set.");
  }
  return letter;
}

// ctx: { callerUid, callerName, opponentUid, opponentName, callerHand,
//        opponentHand, revealedForCaller, revealedForOpponent, args,
//        pickRandom }
// callerHand/opponentHand: { originalTiles, tilesInFront, secretWord }
// revealedFor*: arrays of already-revealed positions in that uid's OWN
//   secretWord (state.revealed[uid]).
// pickRandom: (array) => one element (injected for deterministic tests).
// Returns { tokensAwarded, logMessage, revealedPatch? } — revealedPatch is
// { [uid]: [newly revealed positions to append] }.
const RESOLVERS = {
  'last-letter': (ctx) => {
    const word = ctx.opponentHand.secretWord;
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Last Letter — ${ctx.opponentName}'s word ends in "${word[word.length - 1]}".`,
    };
  },

  'relative-word-length': (ctx) => {
    const built = requireBuiltWord(ctx);
    const opponentLen = ctx.opponentHand.secretWord.length;
    const comparison = opponentLen > built.length ? 'longer' : opponentLen < built.length ? 'shorter' : 'the same length';
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Relative Word Length with "${built}" — ${ctx.opponentName}'s word is ${comparison}.`,
    };
  },

  'letter-strike': (ctx) => {
    const letter = requireLetterInCallerTiles(ctx);
    const present = ctx.opponentHand.secretWord.toUpperCase().includes(letter);
    return {
      tokensAwarded: 2,
      logMessage: `${ctx.callerName} activated Letter Strike on "${letter}" — ${present ? 'it is' : "it isn't"} in ${ctx.opponentName}'s word.`,
    };
  },

  'exact-word-length': (ctx) => ({
    tokensAwarded: 3,
    logMessage: `${ctx.callerName} activated Exact Word Length — ${ctx.opponentName}'s word is ${ctx.opponentHand.secretWord.length} letters.`,
  }),

  'word-builder': (ctx) => {
    const built = requireBuiltWord(ctx);
    const flips = flipAgainstSecretWord(built, ctx.opponentHand.secretWord);
    const flippedDown = flips.filter((f) => !f.present).map((f) => f.letter);
    return {
      tokensAwarded: 4,
      logMessage: `${ctx.callerName} activated Word Builder with "${built}" — ${
        flippedDown.length ? `flipped face-down: ${flippedDown.join(', ')}` : 'every tile stayed face-up'
      }.`,
    };
  },

  'first-letter': (ctx) => ({
    tokensAwarded: 4,
    logMessage: `${ctx.callerName} activated First Letter — ${ctx.opponentName}'s word starts with "${ctx.opponentHand.secretWord[0]}".`,
  }),

  'lets-share': (ctx) => {
    const letter = (ctx.args.letter || '').toUpperCase();
    const inCaller = Boolean(tileMultiset(ctx.callerHand.tilesInFront)[letter]);
    const inOpponent = Boolean(tileMultiset(ctx.opponentHand.tilesInFront)[letter]);
    if (!inCaller || !inOpponent) throw new Error('That letter must be present in both tile sets.');
    const callerCount = countOccurrences(ctx.callerHand.secretWord, letter);
    const opponentCount = countOccurrences(ctx.opponentHand.secretWord, letter);
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Let's Share on "${letter}" — ${ctx.callerName}: ${callerCount}, ${ctx.opponentName}: ${opponentCount}.`,
    };
  },

  'rare-find': (ctx) => {
    const letter = (ctx.args.letter || '').toUpperCase();
    if (!RARE_LETTERS.includes(letter)) throw new Error('Pick one of Z, J, Q, X, or K.');
    const present = ctx.opponentHand.secretWord.toUpperCase().includes(letter);
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Rare Find on "${letter}" — ${present ? 'it is' : "it isn't"} in ${ctx.opponentName}'s word.`,
    };
  },

  'buy-a-vowel': (ctx) => {
    const word = ctx.opponentHand.secretWord;
    const candidates = unrevealedPositions(word, ctx.revealedForOpponent, isVowel);
    if (candidates.length === 0) {
      return {
        tokensAwarded: 1,
        logMessage: `${ctx.callerName} activated Buy a Vowel — no unrevealed vowels remain in ${ctx.opponentName}'s word.`,
      };
    }
    const position = ctx.pickRandom(candidates);
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Buy a Vowel — position ${position + 1} of ${ctx.opponentName}'s word is "${word[position]}".`,
      revealedPatch: { [ctx.opponentUid]: [position] },
    };
  },

  'give-and-take': (ctx) => {
    const callerWord = ctx.callerHand.secretWord;
    const opponentWord = ctx.opponentHand.secretWord;
    const callerCandidates = unrevealedPositions(callerWord, ctx.revealedForCaller);
    const opponentCandidates = unrevealedPositions(opponentWord, ctx.revealedForOpponent);
    const parts = [];
    const patch = {};
    if (callerCandidates.length > 0) {
      const p = ctx.pickRandom(callerCandidates);
      patch[ctx.callerUid] = [p];
      parts.push(`${ctx.callerName} reveals "${callerWord[p]}" (position ${p + 1})`);
    }
    if (opponentCandidates.length > 0) {
      const p = ctx.pickRandom(opponentCandidates);
      patch[ctx.opponentUid] = [p];
      parts.push(`${ctx.opponentName} reveals "${opponentWord[p]}" (position ${p + 1})`);
    }
    return {
      tokensAwarded: 1,
      logMessage: `${ctx.callerName} activated Give and Take — ${parts.join('; ') || 'no unrevealed tiles remained for either player'}.`,
      revealedPatch: patch,
    };
  },

  'burn-the-copies': (ctx) => {
    const letter = (ctx.args.letter || '').toUpperCase();
    if ((tileMultiset(ctx.callerHand.tilesInFront)[letter] || 0) < 2) {
      throw new Error('That letter must appear at least twice in your tile set.');
    }
    const count = countOccurrences(ctx.opponentHand.secretWord, letter);
    return {
      tokensAwarded: 2,
      logMessage: `${ctx.callerName} activated Burn the Copies on "${letter}" — it appears ${count} time${count === 1 ? '' : 's'} in ${ctx.opponentName}'s word.`,
    };
  },

  'vowel-count': (ctx) => {
    const count = ctx.opponentHand.secretWord.toUpperCase().split('').filter(isVowel).length;
    return {
      tokensAwarded: 2,
      logMessage: `${ctx.callerName} activated Vowel Count — ${ctx.opponentName}'s word has ${count} vowel${count === 1 ? '' : 's'}.`,
    };
  },

  'consonant-count': (ctx) => {
    const count = ctx.opponentHand.secretWord
      .toUpperCase()
      .split('')
      .filter((ch) => !isVowel(ch)).length;
    return {
      tokensAwarded: 3,
      logMessage: `${ctx.callerName} activated Consonant Count — ${ctx.opponentName}'s word has ${count} consonant${count === 1 ? '' : 's'}.`,
    };
  },

  'super-strike': (ctx) => {
    const letter = requireLetterInCallerTiles(ctx);
    const word = ctx.opponentHand.secretWord.toUpperCase();
    const positions = [];
    for (let i = 0; i < word.length; i++) if (word[i] === letter) positions.push(i);
    if (positions.length === 0) {
      return {
        tokensAwarded: 3,
        logMessage: `${ctx.callerName} activated Super Strike on "${letter}" — it isn't in ${ctx.opponentName}'s word.`,
      };
    }
    const position = ctx.pickRandom(positions);
    return {
      tokensAwarded: 3,
      logMessage: `${ctx.callerName} activated Super Strike on "${letter}" — it's in ${ctx.opponentName}'s word at position ${position + 1}.`,
      revealedPatch: { [ctx.opponentUid]: [position] },
    };
  },

  'dynamic-word-builder': (ctx) => {
    const built = requireBuiltWord(ctx);
    const flips = flipAgainstSecretWord(built, ctx.opponentHand.secretWord);
    const faceUpCount = flips.filter((f) => f.present).length;
    const flippedDown = flips.filter((f) => !f.present).map((f) => f.letter);
    return {
      // Dynamic value, per the rules doc: "Value = number of tiles that
      // remain face-up" — not a fixed number like every other clue.
      tokensAwarded: faceUpCount,
      logMessage: `${ctx.callerName} activated Dynamic Word Builder with "${built}" — ${faceUpCount} tile${
        faceUpCount === 1 ? '' : 's'
      } stayed face-up${flippedDown.length ? `, flipped face-down: ${flippedDown.join(', ')}` : ''}.`,
    };
  },
};

// 'rhyme-time' deliberately excluded — see the file-header comment and
// wordyHandlers.js's pending-response flow.
export function resolveClue(clueId, ctx) {
  const resolver = RESOLVERS[clueId];
  if (!resolver) throw new Error(`No resolver for clue "${clueId}".`);
  return resolver(ctx);
}

// Re-run after every token change (inside both activateClue and
// guessWord) — covers the immediate-win check, the "pull ahead later via
// clue tokens" case, and the tied-into-tiebreaker transition with one
// function. state.turnOrder is exactly 2 uids (2-player game).
//
// guessedCorrectly[uid] === true means uid's OWN word has been correctly
// guessed BY THEIR OPPONENT — not "uid guessed someone's word". In a
// 2-player game this is unambiguous: if guessedCorrectly[opponentUid] is
// true, uid must be the one who guessed it (there's no one else it could
// have been).
export function checkAndMaybeCompleteGame(state) {
  const [a, b] = state.turnOrder;
  const tokens = state.tokens || {};
  const guessed = state.guessedCorrectly || {};

  for (const [uid, opponentUid] of [
    [a, b],
    [b, a],
  ]) {
    if (guessed[opponentUid] && (tokens[uid] || 0) > (tokens[opponentUid] || 0)) {
      return { phase: 'completed', winnerUid: uid };
    }
  }
  if (guessed[a] && guessed[b] && (tokens[a] || 0) === (tokens[b] || 0)) {
    return { phase: 'tiebreaker' };
  }
  return null;
}
