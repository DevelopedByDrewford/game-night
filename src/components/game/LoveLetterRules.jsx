import './RulesContent.css';

// Full rules text lives here, independent of utils/cards.js's terser
// per-card blurbs (used by the quick Card Reference panel) — the original
// 16-card deck's card values (King=6/Countess=7/Princess=8) don't match
// the Chancellor-edition values CARD_DEFS is keyed to, so reusing that data
// for the "original edition" table below isn't possible without splitting
// it by edition. Kept verbatim from the canonical rules doc.
const ORIGINAL_CARDS = [
  { value: 1, count: 5, name: 'Guard', effect: "Name a card (not Guard) and a player; if you're correct, that player is eliminated." },
  { value: 2, count: 2, name: 'Priest', effect: "Privately look at another player's hand." },
  { value: 3, count: 2, name: 'Baron', effect: 'Privately compare hands with another player; lower value is eliminated.' },
  { value: 4, count: 2, name: 'Handmaid', effect: "You're immune to all other players' effects until your next turn." },
  {
    value: 5,
    count: 2,
    name: 'Prince',
    effect:
      'Choose any player (including yourself) to discard their hand and draw a new card. If the deck is empty, they draw the card that was set aside at the start of the round.',
  },
  { value: 6, count: 1, name: 'King', effect: 'Trade hands with another player of your choice.' },
  {
    value: 7,
    count: 1,
    name: 'Countess',
    effect: 'No targeted effect — but you must discard the Countess if the other card in your hand is the King or Prince.',
  },
  {
    value: 8,
    count: 1,
    name: 'Princess',
    effect: "If you ever discard the Princess (by your own choice or forced by another effect), you're eliminated immediately.",
  },
];

const CHANCELLOR_CARDS = [
  {
    value: 0,
    count: 2,
    name: 'Spy',
    effect:
      'No effect when played. At round end, if you were the only player who played or discarded a Spy this round, gain a bonus Favor Token — in addition to whatever else you earned that round.',
  },
  { value: 1, count: 6, name: 'Guard', effect: 'Same effect as original; one additional copy added to the deck.' },
  {
    value: 6,
    count: 2,
    name: 'Chancellor',
    effect:
      "Draw the top 2 cards of the deck and add them to your hand (you'll briefly hold up to 3 cards total). Choose 2 of your cards to place on the bottom of the deck, in an order of your choosing, keeping the remainder as your hand.",
  },
  { value: 7, count: 1, name: 'King', effect: 'Same effect as original, value increased from 6.' },
  { value: 8, count: 1, name: 'Countess', effect: 'Same effect as original, value increased from 7.' },
  { value: 9, count: 1, name: 'Princess', effect: 'Same effect as original, value increased from 8.' },
];

const FAVOR_TOKENS = [
  { players: 2, original: '7', chancellor: '6' },
  { players: 3, original: '5', chancellor: 'Not confirmed' },
  { players: 4, original: '4', chancellor: 'Not confirmed' },
  { players: 5, original: 'n/a (unsupported)', chancellor: '3' },
  { players: 6, original: 'n/a (unsupported)', chancellor: '3' },
];

function CardTable({ rows }) {
  return (
    <table className="rules-content__table">
      <thead>
        <tr>
          <th>Value</th>
          <th>Count</th>
          <th>Card</th>
          <th>Effect</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>{row.value}</td>
            <td>×{row.count}</td>
            <td>{row.name}</td>
            <td>{row.effect}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LoveLetterRules() {
  return (
    <div className="rules-content">
      <div className="rules-content__section">
        <p className="rules-content__paragraph">
          Each player holds one card at a time (briefly two, mid-turn) representing a person helping deliver a love
          letter to the Princess. Cards have a strength value; the goal each round is to either be the last player
          still "in," or hold the highest-value card when the deck runs out. Winning a round earns a Favor Token;
          first to the target number of tokens (based on player count) wins the game.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Which edition is this?</div>
        <p className="rules-content__paragraph">Two real-world versions are relevant here:</p>
        <ul className="rules-content__list">
          <li>Original (2012), 16 cards, 2–4 players — the base game, detailed below.</li>
          <li>
            Second Edition / "Chancellor edition" (2019), 21 cards, 2–6 players — adds the Spy and Chancellor, bumps
            King/Countess/Princess values up by one, adds a 6th Guard. This is what "Chancellor" refers to.
          </li>
          <li>Premium Edition (2016), 32 cards, up to 8 players — a separate expansion, not covered here.</li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Setup</div>
        <ul className="rules-content__list">
          <li>Shuffle the full deck. Set the top card aside face-down, unused this round.</li>
          <li>2-player games only: additionally set aside 3 more cards face-up, confirmed out of play for the round.</li>
          <li>Deal 1 card to each player as their starting hand; the rest forms the face-down draw deck.</li>
          <li>
            Whoever most recently went on a date (or a random/agreed player) goes first; the winner of the previous
            round goes first in later rounds.
          </li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Turn structure</div>
        <ul className="rules-content__list">
          <li>Draw the top card of the deck (you now hold 2 cards).</li>
          <li>Choose one of your 2 cards to play, face-up, in front of you. You must apply its effect even if unfavorable to you.</li>
          <li>Turn passes to the next player.</li>
          <li>If eliminated, discard your hand face-up without applying its effect, and sit out the rest of the round.</li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Card effects — original 16-card deck</div>
        <CardTable rows={ORIGINAL_CARDS} />
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Card effects — Chancellor (2019) edition</div>
        <p className="rules-content__paragraph">
          Values of King, Countess, and Princess shift up by one to make room for the Chancellor at 6; Spy takes the
          previously-unused value 0; one extra Guard is added.
        </p>
        <CardTable rows={CHANCELLOR_CARDS} />
        <p className="rules-content__note">
          All other cards (Priest, Baron, Handmaid, Prince) are unchanged from the original in both value and effect.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Round end & scoring</div>
        <p className="rules-content__paragraph">A round ends when either:</p>
        <ul className="rules-content__list">
          <li>Only one player remains un-eliminated — they win the round, or</li>
          <li>The deck runs out at the end of a turn — remaining players reveal their hands.</li>
        </ul>
        <p className="rules-content__paragraph">
          <strong>Original edition:</strong> the single highest-value hand wins; a tie is broken by comparing the
          total value of each tied player's discard pile (higher total wins).
        </p>
        <p className="rules-content__paragraph">
          <strong>Chancellor (2019) edition:</strong> the tiebreaker-by-discard-pile rule was removed — all players
          tied for the highest hand value receive a Favor Token (so a round can award more than one token).
          Additionally, apply the Spy bonus token check on top of whatever token(s) were just awarded — it's possible
          for one player to gain two Favor Tokens from a single round.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Favor Tokens needed to win</div>
        <table className="rules-content__table">
          <thead>
            <tr>
              <th>Players</th>
              <th>Original edition</th>
              <th>Chancellor (2019) edition</th>
            </tr>
          </thead>
          <tbody>
            {FAVOR_TOKENS.map((row) => (
              <tr key={row.players}>
                <td>{row.players}</td>
                <td>{row.original}</td>
                <td>{row.chancellor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
