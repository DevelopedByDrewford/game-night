import { HttpsError } from 'firebase-functions/v2/https';
import { sendPushToUid, SITE_ORIGIN, GAME_DISPLAY_NAMES } from './push.js';

function playerName(room, uid) {
  return (room.players || []).find((p) => p.uid === uid)?.displayName || 'A player';
}

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

  // Fired from the gameRooms/{roomId} onDocumentUpdated trigger in
  // index.js on every room write — cheaply diffs playerUids and no-ops
  // unless someone new actually joined, so it's safe to fire on every
  // update (leave/end-game/etc. never add uids). Covers a join via either
  // joinRoomByCode or joinRoomById (an accepted invite), since both just
  // end up as the same playerUids array growth.
  async function onRoomPlayersChanged({ roomId, before, after }) {
    const beforeUids = new Set(before?.playerUids || []);
    const newUids = (after?.playerUids || []).filter((uid) => !beforeUids.has(uid));
    if (newUids.length === 0 || !after?.hostUid) return;

    const gameName = GAME_DISPLAY_NAMES[after.gameType] || 'the game';
    await Promise.all(
      newUids
        .filter((joinedUid) => joinedUid !== after.hostUid)
        .map(async (joinedUid) => {
          const joinerName = playerName(after, joinedUid);
          await db.collection(`users/${after.hostUid}/activity`).doc().set({
            type: 'player_joined',
            playerUid: joinedUid,
            playerName: joinerName,
            gameType: after.gameType,
            roomId,
            roomCode: after.code,
            createdAt: FieldValue.serverTimestamp(),
          });
          await sendPushToUid({
            db,
            FieldValue,
            messaging,
            uid: after.hostUid,
            notification: { title: 'New player!', body: `${joinerName} joined your ${gameName} room (${after.code}).` },
            link: `${SITE_ORIGIN}/rooms/${roomId}`,
          });
        })
    );
  }

  // onCall handler — invited from the Lobby by any current room member
  // (not host-only; anyone already at the table can invite a friend).
  async function inviteToRoom(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, targetUid } = request.data || {};
    if (!roomId || !targetUid) throw new HttpsError('invalid-argument', 'roomId and targetUid are required.');
    if (targetUid === uid) throw new HttpsError('invalid-argument', "You can't invite yourself.");

    const roomSnap = await db.doc(`gameRooms/${roomId}`).get();
    if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found.');
    const room = roomSnap.data();

    if (!(room.playerUids || []).includes(uid)) {
      throw new HttpsError('permission-denied', "You're not in this room.");
    }
    if (room.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'This game has already started.');
    }
    if ((room.playerUids || []).includes(targetUid)) {
      throw new HttpsError('failed-precondition', 'That player is already in the room.');
    }

    const targetSnap = await db.doc(`users/${targetUid}`).get();
    if (!targetSnap.exists) throw new HttpsError('not-found', 'Player not found.');

    const inviterName = playerName(room, uid);
    const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';

    await db.collection(`users/${targetUid}/activity`).doc().set({
      type: 'invite',
      roomId,
      roomCode: room.code,
      gameType: room.gameType,
      inviterUid: uid,
      inviterName,
      createdAt: FieldValue.serverTimestamp(),
    });

    await sendPushToUid({
      db,
      FieldValue,
      messaging,
      uid: targetUid,
      notification: { title: 'Game invite!', body: `${inviterName} invited you to ${gameName} — Room ${room.code}.` },
      link: `${SITE_ORIGIN}/rooms/${roomId}`,
    });

    return { success: true };
  }

  return { onFollowed, onRoomPlayersChanged, inviteToRoom };
}
