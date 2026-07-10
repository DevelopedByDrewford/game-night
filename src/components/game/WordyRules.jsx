import { CLUE_DEFS, CLUE_ORDER } from '../../utils/wordyClues.js';
import './RulesContent.css';

// Clue tables are generated from utils/wordyClues.js (same data the live
// clue picker uses) rather than re-typed here, per that file's own "don't
// duplicate clue text elsewhere in the codebase" note.
function ClueTable({ category }) {
  const rows = CLUE_ORDER.filter((id) => CLUE_DEFS[id].category === category).map((id) => CLUE_DEFS[id]);
  return (
    <table className="rules-content__table">
      <thead>
        <tr>
          <th>Value</th>
          <th>Title</th>
          <th>Effect</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.value ?? '*'}</td>
            <td>{row.title}</td>
            <td>{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WordyRules() {
  return (
    <div className="rules-content">
      <div className="rules-content__section">
        <p className="rules-content__paragraph">
          2 players only. Each player secretly builds a word from a hidden set of letter tiles, then the players'
          tile sets are swapped, and each tries to deduce the other's word before they deduce yours. Winner is
          whoever is ahead on Berry Tokens at the moment a correct guess is made.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Setup</div>
        <ul className="rules-content__list">
          <li>Each player is dealt 4 vowel tiles and 7 consonant tiles (11 total).</li>
          <li>
            8 clue cards are randomly drawn and placed face-up between both players: 4 of the 6 possible Vanilla
            clues, and 4 of the 10 possible Spicy clues. Only these 8 are available for the entire game — this is a
            shared pool, not a separate deck per player.
          </li>
          <li>
            Using only their own dealt letters, each player privately forms any valid word (1 to 11 tiles long) — no
            proper nouns, must exist in the dictionary — and records it as their Secret Word.
          </li>
          <li>
            Once both players have locked in a word, tile sets are swapped: each player is now looking at the other
            player's original 11 tiles, not their own.
          </li>
          <li>
            If a submitted word turns out to be invalid (unspellable from the dealt tiles, or not a real word), that
            player loses the round automatically.
          </li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Turn structure</div>
        <p className="rules-content__paragraph">Each turn, the active player does exactly one of:</p>
        <ul className="rules-content__list">
          <li>Activate a Clue — reveals information about the opponent's Secret Word. The opponent earns Berry Tokens equal to the clue's value.</li>
          <li>
            Guess the Secret Word — spell out the guessed word using the tiles in front of them. Correct: opponent's
            clue-token income for this word stops. Incorrect: guesser's opponent gets +2 Berry Tokens; turn ends.
          </li>
        </ul>
        <p className="rules-content__paragraph">
          Only one clue may be activated per turn, and only clues from the game's 8-card face-up pool are available
          at all — the other 8 clue types aren't in play that game.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Win conditions</div>
        <ul className="rules-content__list">
          <li>Guessing correctly does not automatically win — token standing matters.</li>
          <li>If the guesser is strictly ahead on tokens at the moment of a correct guess, they win immediately.</li>
          <li>
            If tied or behind, the game continues; the guesser wins the moment they pull ahead by any margin (via
            further clue tokens from remaining play).
          </li>
          <li>
            Tiebreaker (both words correctly guessed, tokens exactly even): both players race to spell a new valid
            4-letter word from their own tile set (not already used in the game); first valid submission wins.
          </li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Vanilla clues</div>
        <ClueTable category="vanilla" />
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Spicy clues</div>
        <ClueTable category="spicy" />
      </div>
    </div>
  );
}
