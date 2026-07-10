// Personal-project single deployment target — update if the site ever
// moves domains. Used to build the deep link a notification opens.
export const SITE_ORIGIN = 'https://game-night.drewford.dev';

// functions/ is a separate deployable from src/ (see scripts/seedCatalog.mjs
// for the frontend's copy of these same display names) — duplicated rather
// than shared, same as the card definitions in deck.js. Shared here (rather
// than living in handlers.js) since both handlers.js and social.js build
// notification/activity text that needs a display name.
export const GAME_DISPLAY_NAMES = { 'love-letter': 'Love Letter', 'a-little-wordy': 'A Little Wordy' };

// Room names are optional and don't need to be unique — the invite code is
// what actually identifies/joins a room. Every push/activity surface that
// used to hardcode "Room {code}" should go through this so a named room
// shows its name instead, everywhere at once.
export function roomLabel(room) {
  const name = room?.name?.trim();
  return name ? name : `Room ${room?.code || ''}`;
}

// Shared "send a push notification to every device a user has registered"
// helper (users/{uid}.pushTokens) — used by turn notifications and the
// new-follower notification. Always call this AFTER whatever write
// triggered it has committed (never from inside a transaction, which can
// retry on contention and risk a double-send). Never throws — a failed or
// undeliverable push shouldn't fail the action that triggered it.
export async function sendPushToUid({ db, FieldValue, messaging, uid, notification, link }) {
  if (!uid || !messaging) return;
  try {
    const userSnap = await db.doc(`users/${uid}`).get();
    const tokens = userSnap.exists ? userSnap.data()?.pushTokens || [] : [];
    if (tokens.length === 0) return;

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification,
      ...(link ? { webpush: { fcmOptions: { link } } } : {}),
    });

    const staleTokens = (response?.responses || [])
      .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i] : null))
      .filter(Boolean);
    if (staleTokens.length > 0) {
      await db.doc(`users/${uid}`).update({ pushTokens: FieldValue.arrayRemove(...staleTokens) });
    }
  } catch (err) {
    console.error('[sendPushToUid] failed to notify', uid, err);
  }
}

// Called once a game has just dealt/started (Love Letter's startGame,
// A Little Wordy's dealTiles) — records a game_started activity entry for
// every participant, and pushes a "Game starting!" notification to
// everyone EXCEPT `notifyUid` (whoever's turn it already is — they get the
// more specific "It's your turn!" push from sendPushToUid separately, so
// this skips them to avoid a redundant back-to-back push. Pass `null` if
// no one has a specific "your turn" push already queued.
export async function notifyGameStarted({ db, FieldValue, messaging, room, roomId, turnOrder, notifyUid }) {
  const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
  await Promise.all(
    turnOrder.map(async (participantUid) => {
      await db.collection(`users/${participantUid}/activity`).doc().set({
        type: 'game_started',
        gameType: room.gameType,
        roomId,
        roomCode: room.code,
        roomName: room.name || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (participantUid === notifyUid) return;
      await sendPushToUid({
        db,
        FieldValue,
        messaging,
        uid: participantUid,
        notification: { title: 'Game starting!', body: `${gameName} in ${roomLabel(room)} is starting now.` },
        link: `${SITE_ORIGIN}/rooms/${roomId}`,
      });
    })
  );
}
