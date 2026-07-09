// Personal-project single deployment target — update if the site ever
// moves domains. Used to build the deep link a notification opens.
export const SITE_ORIGIN = 'https://game-night.drewford.dev';

// functions/ is a separate deployable from src/ (see scripts/seedCatalog.mjs
// for the frontend's copy of these same display names) — duplicated rather
// than shared, same as the card definitions in deck.js. Shared here (rather
// than living in handlers.js) since both handlers.js and social.js build
// notification/activity text that needs a display name.
export const GAME_DISPLAY_NAMES = { 'love-letter': 'Love Letter' };

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
