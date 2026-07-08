# Love Letter card art (drop-in)

No art files ship yet — `PlayingCard` renders its striped placeholder until
real images land here. `src/utils/cardArt.js` already points at the expected
filenames below; add files with these exact names and pass the looked-up
URL as `PlayingCard`'s `frontImageUrl`/`backImageUrl` prop to switch it on.

- `back.png` — shared card back (all cards use one design)
- `spy-front.png`
- `guard-front.png`
- `priest-front.png`
- `baron-front.png`
- `handmaid-front.png`
- `prince-front.png`
- `chancellor-front.png`
- `king-front.png`
- `countess-front.png`
- `princess-front.png`

Spy and Chancellor are only used in 5-6 player games (the "Extended" ruleset)
but still need art if you want their in-hand labels to render as art instead
of the striped placeholder in those games.
