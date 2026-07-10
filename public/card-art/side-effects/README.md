# Side Effects card art (drop-in)

No art files ship yet — `PlayingCard` renders its striped placeholder until
real images land here. `src/utils/sideEffectsCardArt.js` already points at
the expected filenames below; add files with these exact names and the
lookup switches on automatically, no code changes needed.

Physical cards are **2.7in × 4.52in** (portrait, ~0.597 aspect ratio) — size
art to that ratio so it doesn't get cropped or padded oddly at the card
sizes the table UI renders.

- `back.png` — shared card back (all cards use one design)

Disorders (8):
- `anxiety-front.png`
- `anorexia-front.png`
- `depression-front.png`
- `gamblingAddiction-front.png`
- `impotence-front.png`
- `madness-front.png`
- `suicidalThoughts-front.png`
- `tremors-front.png`

Treatments/Drugs (7 — every Disorder except Anorexia, which is Therapy-only):
- `anxietyTreatment-front.png`
- `depressionTreatment-front.png`
- `gamblingAddictionTreatment-front.png`
- `impotenceTreatment-front.png`
- `madnessTreatment-front.png`
- `suicidalThoughtsTreatment-front.png`
- `tremorsTreatment-front.png`

Generic (2):
- `episode-front.png`
- `therapy-front.png`

Booster Shot expansion, only used when a room's ruleset is `'booster'` (2):
- `misdiagnosis-front.png`
- `highTolerance-front.png`
