import { sendPushToUid, SITE_ORIGIN } from './push.js';

// Same factory shape as functions/lib/handlers.js#createHandlers — takes
// the Admin SDK Firestore instance (or functions/test/fakeFirestore.js) and
// FieldValue/Messaging, returns plain testable handler functions. Kept out
// of handlers.js since that module is game/room-specific.
export function createSocialHandlers({ db, FieldValue, messaging }) {
  // Fired from the users/{followerUid}/follows/{followedUid}
  // onDocumentCreated trigger in index.js — `followerUid` is the doc's
  // owner (who did the following), `followedUid` is the path param (who
  // got followed). Writes an activity feed entry for the followed user and
  // pushes them a notification. Not run inside a transaction — there's no
  // read-modify-write race to protect (the activity doc is a fresh
  // auto-ID), matching how sendPushToUid already runs standalone.
  async function onFollowed({ followerUid, followedUid }) {
    const [followerSnap, followedSnap] = await Promise.all([
      db.doc(`users/${followerUid}`).get(),
      db.doc(`users/${followedUid}`).get(),
    ]);
    if (!followedSnap.exists) return; // shouldn't happen — followUser() checks the target exists first
    const followerName = followerSnap.exists ? followerSnap.data()?.displayName || 'A player' : 'A player';

    await db.collection(`users/${followedUid}/activity`).doc().set({
      type: 'follow',
      actorUid: followerUid,
      actorName: followerName,
      createdAt: FieldValue.serverTimestamp(),
    });

    await sendPushToUid({
      db,
      FieldValue,
      messaging,
      uid: followedUid,
      notification: { title: 'New follower!', body: `${followerName} started following you.` },
      link: `${SITE_ORIGIN}/profile/${followerUid}`,
    });
  }

  return { onFollowed };
}
