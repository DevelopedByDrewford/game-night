import './RulesContent.css';

const PUNISHMENTS = [
  { name: 'Anxiety', effect: 'Inflictor may take 1 card from your revealed hand.', duration: 'Immediate' },
  { name: 'Gambling Addiction', effect: 'Inflictor draws 3 random cards from your hand.', duration: 'Immediate' },
  { name: 'Madness', effect: 'Discard every Drug currently on your Psyche (un-treats everything).', duration: 'Immediate' },
  { name: 'Suicidal Thoughts', effect: 'Discard your entire hand.', duration: 'Immediate' },
  { name: 'Tremors', effect: 'Discard 3 random cards (or your whole hand if you hold fewer than 3).', duration: 'Immediate' },
  { name: 'Anorexia', effect: "You don't draw on your next turn.", duration: 'Next turn' },
  { name: 'Depression', effect: 'You sit out your entire next turn — no draw, no play.', duration: 'Next turn' },
  { name: 'Impotence', effect: 'You draw normally but cannot play any card on your next turn.', duration: 'Next turn' },
];

const SIDE_EFFECTS = [
  { drug: 'Anxiety Treatment', list: 'Suicidal Thoughts, Depression, Madness' },
  { drug: 'Depression Treatment', list: 'Impotence, Suicidal Thoughts, Anorexia' },
  { drug: 'Gambling Addiction Treatment', list: 'Impotence' },
  { drug: 'Impotence Treatment', list: 'Anxiety' },
  { drug: 'Madness Treatment', list: 'Tremors' },
  { drug: 'Suicidal Thoughts Treatment', list: 'Madness' },
  { drug: 'Tremors Treatment', list: 'Gambling Addiction, Depression, Madness' },
];

export function SideEffectsRules() {
  return (
    <div className="rules-content">
      <div className="rules-content__section">
        <p className="rules-content__paragraph">
          Each player starts with a hand of Disorder cards face-up in their <strong>Psyche</strong> and races to treat
          every one of them using Drug or Therapy cards from a concealed hand. Treating a Disorder makes you
          vulnerable to that Drug's side effects — other players holding those Disorder cards can add them to your
          Psyche. Episode cards trigger the punishment printed on an opponent's untreated Disorder. First player to
          fully treat their Psyche wins immediately.
        </p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Setup</div>
        <ul className="rules-content__list">
          <li>
            Disorders are dealt separately: 4 face-up per player (3 at 6–8 players) as your starting Psyche. A Psyche
            can never hold 2 of the same Disorder.
          </li>
          <li>Leftover Disorders are shuffled back into the rest of the deck, then 4 cards are dealt face-down per player as their hand.</li>
          <li>The remainder is the draw pile. Random first player, turns move clockwise.</li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Turn structure</div>
        <ul className="rules-content__list">
          <li>Draw 2 cards (skipped if you're Anorexia- or Depression-restricted this turn).</li>
          <li>Play up to 2 cards — you're not required to play anything. End your turn whenever you're done.</li>
          <li>If your hand is over 6 cards at turn's end, discard down to 6.</li>
          <li>If the draw pile runs out, the discard pile is reshuffled into a new one.</li>
        </ul>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Ways to play a card</div>
        <ul className="rules-content__list">
          <li><strong>Treat</strong> — play a Drug onto the matching, untreated Disorder in your own Psyche.</li>
          <li>
            <strong>Give a Disorder</strong> — play a Disorder card from your hand onto another player, if they have an
            active Drug whose side-effect list includes it and they don't already have that Disorder.
          </li>
          <li><strong>Therapy</strong> — discard any Disorder from your own Psyche (except Tremors) along with the Therapy card.</li>
          <li><strong>Episode</strong> — trigger the punishment on an opponent's untreated Disorder; discard the Episode card after.</li>
        </ul>
        <p className="rules-content__note">A treated Disorder (one with a Drug on it) is immune to Episode punishments until that Drug is removed.</p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Disorder punishments</div>
        <table className="rules-content__table">
          <thead>
            <tr>
              <th>Disorder</th>
              <th>Punishment</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {PUNISHMENTS.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.effect}</td>
                <td>{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Drug side effects</div>
        <p className="rules-content__paragraph">Treating with a Drug makes you vulnerable to receiving these Disorders from another player:</p>
        <table className="rules-content__table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>May cause</th>
            </tr>
          </thead>
          <tbody>
            {SIDE_EFFECTS.map((row) => (
              <tr key={row.drug}>
                <td>{row.drug}</td>
                <td>{row.list}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="rules-content__note">Anorexia has no Drug — it can only be cured with Therapy. Tremors is immune to Therapy — it needs its own Treatment card.</p>
      </div>

      <div className="rules-content__section">
        <div className="rules-content__heading">Booster Shot (optional)</div>
        <ul className="rules-content__list">
          <li><strong>Misdiagnosis</strong> — swap one Disorder in your Psyche with one Disorder card in your hand; you may keep the swapped-out Disorder in hand.</li>
          <li><strong>High Tolerance</strong> — remove a Drug from another player's Psyche, un-treating that Disorder.</li>
        </ul>
      </div>
    </div>
  );
}
