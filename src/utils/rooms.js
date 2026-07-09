import { doc, runTransaction, updateDoc, deleteDoc, serverTimestamp, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase.js';
import { generateInviteCode } from './inviteCode.js';

const MAX_PLAYERS = 6;

// Room create/join/leave/end involve no hidden information, so they run as
// plain client-side Firestore transactions here rather than Cloud Functions
// — see the plan's Phase 0 simplification. startGame (dealing hands) is
// server-authoritative from Phase 1 on: it's a thin wrapper around the
// `startGame` Cloud Function so LobbyContainer's call site doesn't change.

export async function createRoom({ gameType = 'love-letter', hostUid, hostDisplayName, playerCount, ruleset, autoSkip }) {
  const roomRef = doc(collection(db, 'gameRooms'));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const codeRef = doc(db, 'roomCodes', code);

    try {
      await runTransaction(db, async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (codeSnap.exists()) throw new Error('CODE_TAKEN');

        tx.set(codeRef, { roomId: roomRef.id });
        tx.set(roomRef, {
          gameType,
          code,
          hostUid,
          status: 'waiting',
          playerUids: [hostUid],
          players: [{ uid: hostUid, displayName: hostDisplayName, seat: 0 }],
          settings: { playerCount, ruleset, autoSkipEnabled: autoSkip, autoSkipMinutes: 10 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      return { roomId: roomRef.id, code };
    } catch (err) {
      if (err.message === 'CODE_TAKEN' && attempt < 4) continue;
      throw err;
    }
  }

  throw new Error('Could not generate a unique invite code — please try again.');
}

export async function joinRoomByCode({ code, uid, displayName }) {
  const normalizedCode = code.trim().toUpperCase();
  const codeRef = doc(db, 'roomCodes', normalizedCode);

  return runTransaction(db, async (tx) => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists()) throw new Error('ROOM_NOT_FOUND');

    const roomRef = doc(db, 'gameRooms', codeSnap.data().roomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) throw new Error('ROOM_NOT_FOUND');

    const room = roomSnap.data();
    if (room.status !== 'waiting') throw new Error('ROOM_NOT_JOINABLE');
    if (room.playerUids.includes(uid)) return { roomId: roomRef.id };
    if (room.playerUids.length >= MAX_PLAYERS) throw new Error('ROOM_FULL');

    const seat = room.players.length;
    tx.update(roomRef, {
      playerUids: [...room.playerUids, uid],
      players: [...room.players, { uid, displayName, seat }],
      updatedAt: serverTimestamp(),
    });

    return { roomId: roomRef.id };
  });
}

export async function leaveRoom({ roomId, uid }) {
  const roomRef = doc(db, 'gameRooms', roomId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) return;
    const room = snap.data();
    tx.update(roomRef, {
      playerUids: room.playerUids.filter((id) => id !== uid),
      players: room.players.filter((p) => p.uid !== uid),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startGame({ roomId }) {
  const call = httpsCallable(functions, 'startGame');
  const result = await call({ roomId });
  return result.data;
}

export async function endGameEarly({ roomId }) {
  return updateDoc(doc(db, 'gameRooms', roomId), { status: 'completed', updatedAt: serverTimestamp() });
}

// Host-only cleanup for a room that's not actively being played (waiting on
// players, or already completed) — e.g. an accidental solo room that never
// filled up, with no other player around to hit "End Game Early" first.
// Frees the invite code before deleting the room doc, since the code's
// delete rule needs to read the still-existing room to check hostUid/status
// — a failure there is non-fatal (worst case a squatted code, which
// createRoom already retries around on collision), so the room itself still
// gets deleted either way.
export async function deleteRoom({ roomId, code }) {
  try {
    await deleteDoc(doc(db, 'roomCodes', code));
  } catch (err) {
    console.error('[deleteRoom] failed to free invite code', err);
  }
  await deleteDoc(doc(db, 'gameRooms', roomId));
}
