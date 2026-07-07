# Handoff: Game Night Platform — Branding & Core Screens

## Overview
Game Night is a multiplayer game platform. Users create profiles, follow friends, and join persistent game rooms. It launches with one game (Love Letter, a hidden-information card game, 2–8 players) but is built to add more games later. This package covers the brand direction plus the top-priority screens: Dashboard, Catalog, Create Room, Waiting Room/Lobby, Active Game Table (Love Letter), Profile, and Friends/Following.

## About the Design Files
The bundled file (`Game Night.dc.html`) is a **design reference built in HTML** — a clickable prototype showing intended look, layout, and behavior. It is not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, native, etc.), using its established component patterns, state management, and build tooling — or, if no environment exists yet, choose the most appropriate framework and implement there.

Open the HTML file directly in a browser to click through the live prototype: a top-right toggle switch on the Dashboard screen swaps between the desktop layout and a mobile phone-frame mockup. Persistent nav (Dashboard/Catalog/Friends/Profile) lets you jump between the four main screens; "Create Room" → "Start Game" → clicking games walks the Create Room → Lobby → Active Table flow.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and component styling are final-direction (not placeholder gray boxes), except: card artwork (diagonal striped swatches) is an explicit placeholder standing in for real game art, and all copy/data (player names, stats, action log entries) is sample content.

## Brand Direction
- **Concept**: cozy tabletop game-night warmth with a 70s aesthetic — warm earthy palette, groovy rounded shapes, retro "tube stripe" line art.
- **Logo mark**: a 3-band rounded arch (rainbow/tube motif), built from 3 stacked color divs clipped by a container with `border-radius: R R 0 0` and `overflow:hidden`. Colors top→bottom: terracotta, mustard, avocado. Paired with "Game Night" set in Bree Serif.
- **Decorative motif**: a site-wide "swoosh" background — parallel 3-color pipe/tube shapes (diagonal bar + a rounded arch elbow flowing into a horizontal bar) rendered at low opacity (~0.3) behind all content, fixed to the viewport. Built from flex columns of colored bars (straight pipes) and concentric rounded borders with gaps (the elbow bend) — no SVG.

## Design Tokens

### Colors
- Ink (text/outline, always used at reduced opacity for borders): `#2E2013`
- Page background: `#E8DABF` (warm off-white/light brown), with a subtle 16px dot-grid texture at 5% ink opacity
- Card/surface background: `#F5ECD8`
- Terracotta (primary accent / CTA): `#C8592F`
- Mustard (secondary accent): `#E3A73E`
- Avocado (tertiary accent): `#7C8C4A`
- Muted/offline dot: `#b0a48c`
- Borders on cards/buttons: `rgba(46,32,19,.16)` at 1.5px (soft, not solid black — avoid heavy cartoon outlines)
- Card elevation shadow: `0 12px 28px rgba(46,32,19,.14)` (soft, not hard-offset)
- Button shadow: `0 8px 20px rgba(46,32,19,.18)`

### Typography
- Display/headline: **Bree Serif** (Google Font) — used for page titles ("My Games", "Choose a Game", player name on Profile, etc.), sizes 30–48px, `letter-spacing:-1px`
- Body/UI: **Work Sans** (Google Font), weights 400–800
- Monospace (invite codes only): system monospace

### Spacing / Radius
- Page content max-width: 1100px (grid screens), 640px (single-column screens: Create Room, Lobby, Profile, Friends)
- Card radius: 16–20px; buttons: pill (30px / fully rounded); small badges: 12–14px
- Grid gaps: 20–22px

## Screens / Views

### 1. Dashboard / My Games (desktop + mobile)
**Purpose**: land on active/waiting games, start or join new ones.
**Desktop layout**: persistent top nav (logo + Dashboard/Catalog/Friends/Profile links + avatar), hero title "My Games" + subtitle, two CTA buttons top-right ("+ Create Room" filled terracotta pill, "Join via code" outline pill with a 4-character code input affordance), then a responsive grid (`repeat(auto-fill, minmax(280px,1fr))`, gap 20px) of game cards. Each card: 48px art-thumbnail placeholder, game name + "Love Letter" subtitle, row of overlapping player avatar circles (26px, -8px overlap), status pill (filled terracotta "Your Turn", outline "Waiting…" / "In Progress"). Trailing empty-state card in the grid with a subtle dot-texture background inviting the user to browse the catalog.
**Mobile layout**: rendered in-prototype as a phone-frame mockup (390px wide, 10px dark bezel, rounded 44px). Compact header (small logo mark + avatar only, nav links removed). Stacked hero (30px title). CTA buttons full-width and stacked vertically instead of side-by-side. Game cards full-width single column, smaller thumbnail (40px) and avatars (20px). A bottom tab bar (Dashboard/Catalog/Friends/Profile, icon dot + 10px label) replaces the top nav links.
**Interactions**: "+ Create Room" → Create Room screen. Game card → (not wired in prototype, would go to Lobby or Active Table depending on game status). Desktop/Mobile toggle (top-right pill switch, prototype-only affordance) swaps the two layouts.

### 2. Game Catalog
**Purpose**: choose which game to play.
**Layout**: max-width 1100px, title "Choose a Game" + subtitle, grid (`minmax(240px,1fr)`, gap 22px) of game cards: 150px art placeholder header, name (18px bold), player-count range, then either a filled terracotta "Play Now" button (Love Letter) or a dashed-outline "🔒 Coming Soon" chip at 55% opacity (Connect 4, Mancala — visibly disabled/desaturated).
**Interactions**: "Play Now" → Create Room.

### 3. Create Room
**Purpose**: configure a new Love Letter room before inviting friends.
**Layout**: single card (max-width 640px) containing, top to bottom:
- Player count stepper: – / + circular buttons around a large Bree Serif number, range 2–8, label "players (2–8)"
- Ruleset picker: two-option segmented control ("Classic" / "Rumor Variant"), selected option filled terracotta
- Auto-skip toggle: label + description ("Skip a turn if a player doesn't act in time") + a pill switch, **defaults to off**
- Invite code: large monospace 4-character code in a bordered box, plus "Copy" (mustard) and "Share" (avocado, light text) buttons
- Primary CTA "Create Room →" (full-width terracotta pill) at the bottom
**Interactions**: –/+ clamp at 2 and 8. Ruleset buttons are mutually exclusive selection. Toggle flips a boolean. "Create Room →" → Waiting Room.

### 4. Waiting Room / Lobby
**Purpose**: see who has joined before starting.
**Layout**: title "Waiting Room" + invite code shown top-right, subtitle "{n} of {playerCount} seats filled". List of seat rows (one per configured player slot): filled seats show avatar (42px circle) with an online/offline status dot bottom-right, name + "(Host)" tag if applicable, status label ("Online"/"Offline"/"Online · Host"), and a "Leave" button for non-host players. Empty seats show a dashed-outline circle + "Open seat" placeholder text.
Primary CTA "Start Game" (full-width pill) — only enabled/colored terracotta once ≥2 players are seated (otherwise muted); helper text below explains the host-only + minimum-players rule.
**Interactions**: "Start Game" → Active Game Table. Back arrow (room chrome header) → Dashboard.

### 5. Active Game Table (Love Letter) — core screen
**Purpose**: play a live round.
**Layout**: two-column: left column (flex:2) has opponent seats in a row (avatar circle with status dot, name, status label, and their discard pile as small stacked card-back rectangles), then a centered turn indicator ("▶ {name}'s turn", dashed terracotta pill) with the deck (card-back rectangle) and remaining count, then the current user's own hand in a visually distinct panel (terracotta border + tinted background, labeled "YOUR HAND — PRIVATE") showing 1–2 cards with rank name. Right column (flex:1) is a bordered Action Log panel — scrollable list of plain-text turn-by-turn events.
Room chrome header shows the room name and, for the host, an "End Game Early" pill button.
**Design note — card art must stay modular**: each hand/discard/deck card here is a placeholder (bordered rectangle + diagonal striped fill + rank label) standing in for swappable artwork. Implement rendering so the visual "skin" (card back, suit/rank art) can be swapped by theme without touching the table layout logic.
**Design note — presence consistency**: the online/offline status dot (small circle, avocado = online, muted tan = offline, with a background-colored ring) must use the exact same visual treatment here as in the Lobby and Friends screens so users read it as one consistent feature.

### 6. Profile
**Purpose**: view identity and per-game stats.
**Layout**: max-width 640px. Hero row: 88px avatar circle + display name (Bree Serif) + join date/friend count, set against a textured "shag rug" background panel (a repeating 3-color dot pattern at 15–18% opacity — 70s texture callback, kept subtle). Below: "Stats by game" list — one row per game, art-thumbnail + name + "{wins}W – {losses}L · {rate}% win rate" for live games, or "Coming soon" at reduced opacity for not-yet-launched games.

### 7. Friends / Following
**Purpose**: one-directional follow list with presence.
**Layout**: max-width 640px, title "Following" + subtitle, search input + "+ Follow" button row, then a list of rows: avatar (42px) + status dot (same treatment as Lobby/Table), name, status label, and an "Invite" button per friend.

## Interactions & Behavior Summary
- All navigation is instant (no transition/animation currently implemented) — client-side state swap between named screens: `dashboard | catalog | create | lobby | table | profile | friends`.
- Create Room state: `playerCount` (int, 2–8, clamped), `variant` ('classic' | 'rumor'), `autoSkip` (boolean, default false).
- Dashboard has a `device` state ('desktop' | 'mobile') purely for this prototype's side-by-side review; a real app would use responsive layout / actual device detection instead of a manual toggle.
- No loading/error states are designed yet — flag this as an open gap for engineering (network latency, disconnect/reconnect during a live game, invalid invite codes, room-full errors, etc. all need states).

## State Management (suggested)
- Current screen / route
- Current user (id, display name, avatar)
- Current room (id, invite code, ruleset, autoSkip, seats[], status)
- Live game state (turn order, current turn, deck count, each player's discard pile + hand-count, current user's private hand, action log entries) — likely via websocket/subscription given the multiplayer, hidden-information nature of Love Letter
- Friends list with live presence (online/offline), one-directional follow relationship
- Per-user, per-game stats (wins/losses) for Profile

## Assets
No external image assets — all placeholders are CSS (diagonal repeating-gradient stripes, dot-grid textures). Fonts loaded from Google Fonts: Bree Serif, Work Sans. Real card/game artwork, avatars, and icons are not yet supplied and should be sourced/commissioned separately; keep the card-rendering component swappable per the note in screen 5.

## Files
- `Game Night.dc.html` — the full interactive prototype (all 7 screens + mobile Dashboard mockup, in one file). Open directly in any browser.
