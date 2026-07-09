# A Little Wordy — Rules Reference

Canonical implementation spec for Game Night's **A Little Wordy** game type.
Cloud Functions resolving clue effects, guesses, and win conditions should
treat this file as the source of truth — don't duplicate clue text elsewhere
in the codebase (reference this doc in comments instead).

2 players only. Each player secretly builds a word from a hidden set of
letter tiles, then the players' tile sets are swapped, and each tries to
deduce the other's word before they deduce yours. Winner is whoever is ahead
on Berry Tokens at the moment a correct guess is made (or wins the game
outright without needing tokens if this implementation simplifies the
token-bank mechanic — see [Implementation notes](#implementation-notes)).

## Setup

- Each player is dealt 4 vowel tiles and 7 consonant tiles (11 total).
- 8 clue cards are randomly drawn and placed face-up between both players: 4
  from the 6 possible Vanilla clues, and 4 from the 10 possible Spicy clues.
  Only these 8 are available for the entire game — the other 8 clue types
  simply aren't in play that round. This is a shared pool, not a separate
  deck per player.
- Using only their own dealt letters, each player privately forms any valid
  word (1 to 11 tiles long) — no proper nouns, must exist in the dictionary —
  and records it as their Secret Word.
- Once both players have locked in a word, tile sets are swapped: each
  player is now looking at the other player's original 11 tiles, not their
  own.
- If a submitted word turns out to be invalid (unspellable from the dealt
  tiles, or not a real word), that player loses the round automatically.

## Turn structure

Each turn, the active player does exactly one of:

- **Activate a Clue** (see table below) — reveals information about the
  opponent's Secret Word. The opponent earns Berry Tokens equal to the
  clue's value.
- **Guess the Secret Word** — spell out the guessed word using the tiles in
  front of them.
  - Correct: opponent's clue-token income for this word stops (see
    [Win conditions](#win-conditions)).
  - Incorrect: guesser's opponent gets +2 Berry Tokens; turn ends.

Only one clue may be activated per turn, and only clues from the game's
8-card face-up pool (see Setup) are available at all — the other 8 clue
types aren't in play that game. **An activated clue is removed from the
pool after use** (single-use, confirmed for this implementation — see
[Implementation notes](#implementation-notes)); it can't be activated again
by either player for the rest of the game.

## Win conditions

- Guessing correctly does not automatically win — token standing matters.
- If the guesser is strictly ahead on tokens at the moment of a correct
  guess, they win immediately.
- If tied or behind, the game continues; the guesser wins the moment they
  pull ahead by any margin (via further clue tokens from remaining play),
  without their already-guessed opponent getting a "comeback" mechanic
  beyond continuing to award clue tokens.
- **Tiebreaker** (both words correctly guessed, tokens exactly even): both
  players race to spell a new valid 4-letter word from their own tile set
  (not already used in the game); first valid submission wins.

## Clue table

### Vanilla

| Value | Title | Effect |
| --- | --- | --- |
| 1 | Last Letter | Opponent reveals the last letter of their Secret Word. |
| 1 | Relative Word Length | Build a valid word from your tiles; opponent tells you whether their Secret Word is longer, shorter, or the same length. |
| 2 | Letter Strike | Choose a letter from your tile set; opponent tells you if it's in their Secret Word. |
| 3 | Exact Word Length | Opponent reveals the exact length of their Secret Word. |
| 4 | Word Builder | Build a valid word from your tiles; opponent flips face-down every tile in that word that does not appear in their Secret Word. Duplicate letters are treated separately. |
| 4 | First Letter | Opponent reveals the first letter of their Secret Word. |

### Spicy

| Value | Title | Effect |
| --- | --- | --- |
| 1 | Let's Share | Choose a letter present in both tile sets; both players reveal how many times it appears in their own Secret Word. Disabled once your opponent has already correctly guessed your word. |
| 1 | Rare Find | Pick one of Z/J/Q/X/K; opponent tells you if it's in their Secret Word. |
| 1 | Buy a Vowel | Opponent reveals a not-yet-revealed vowel tile in their Secret Word (or tells you none remain). |
| 1 | Give and Take | Both players each reveal one not-yet-revealed letter tile from their own Secret Word. Duplicates treated separately. Disabled once your opponent has already correctly guessed your word. |
| 2 | Burn the Copies | Choose a letter appearing at least twice in your tile set; opponent tells you how many times it's in their Secret Word. |
| 2 | Vowel Count | Opponent reveals the number of vowel tiles in their Secret Word. |
| 3 | Consonant Count | Opponent reveals the number of consonant tiles in their Secret Word. |
| 3 | Super Strike | Choose a letter from your tile set; opponent tells you if it's in their Secret Word, and if so, also reveals the position of one instance. |
| 5 | Rhyme Time | Opponent says a valid word that rhymes with their Secret Word (or invents one if none exists). |
| * | Dynamic Word Builder | Build a valid word from your tiles; opponent flips face-down every tile that does not appear in their Secret Word (duplicates separate). Value = number of tiles that remain face-up. |

## Implementation notes

(for whoever's building this)

- **Token bank**: the physical game uses a finite shared token bank; this
  digital version can simplify to an unbounded running counter per player
  (increment freely) rather than modeling bank depletion — same outcome,
  less state to track.
- **Clue pool**: the physical game randomly draws 8 of the 16 total clue
  cards (4 of 6 Vanilla, 4 of 10 Spicy) at game start and places them
  face-up as a shared pool both players draw from — it's not a personal
  deck per player, and not free access to all 16. Implement this:
  `startGame`/dealing should randomly select the pool and store it in
  `state/current.availableClues` (array of clue IDs), and `activateClue`
  should reject any clue ID not in that array.
- **Reuse vs. single-use**: not confirmed by the physical-game source
  material either way. **Confirmed for this implementation (2026-07-10):
  single-use** — `activateClue` removes the clue ID from
  `state/current.availableClues` on activation, so it can't be picked again
  by either player. (An 8-card pool exhausting over a full game is an
  accepted tradeoff of this choice, not an oversight.)
- **Letter/tile distribution**: the vowel-bag and consonant-bag letter
  frequencies (how many of each letter) aren't specified here and are
  needed for fair random dealing. Needs to be sourced or approximated (e.g.
  a Scrabble-like frequency table) before `dealTiles` can be implemented
  for real.
- **Dictionary validation**: needed both for initial Secret Word submission
  and for clue-triggered word building (Word Builder, Relative Word Length,
  Rhyme Time). No official word list is available to this app. **Confirmed
  for this implementation (2026-07-10): the `word-list` npm package**
  (Sindresorhus, ~275k SCOWL-derived English words, Unlicense/public
  domain), bundled server-side and loaded into a `Set` at cold start —
  never a live call to any third-party dictionary API.
