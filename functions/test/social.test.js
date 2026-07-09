import { describe, it, expect, vi } from 'vitest';
import { createFakeFirestore, fakeFieldValue } from './fakeFirestore.js';
import { createSocialHandlers } from '../lib/social.js';

function makeFakeMessaging() {
  return { sendEachForMulticast: vi.fn().mockResolvedValue({ responses: [] }) };
}

describe('onFollowed', () => {
  it('writes a follow activity entry for the followed user', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice' });
    setDoc('users/bob', { displayName: 'Bob' });

    await handlers.onFollowed({ followerUid: 'alice', followedUid: 'bob' });

    const activity = getCollection('users/bob/activity');
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ type: 'follow', actorUid: 'alice', actorName: 'Alice' });
  });

  it('pushes a notification to every device the followed user has registered', async () => {
    const { db, setDoc } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice' });
    setDoc('users/bob', { displayName: 'Bob', pushTokens: ['tok-bob'] });

    await handlers.onFollowed({ followerUid: 'alice', followedUid: 'bob' });

    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(messaging.sendEachForMulticast.mock.calls[0][0]).toMatchObject({
      tokens: ['tok-bob'],
      notification: { title: 'New follower!', body: 'Alice started following you.' },
    });
  });

  it('falls back to "A player" if the follower has no displayName', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/bob', { displayName: 'Bob' });

    await handlers.onFollowed({ followerUid: 'ghost', followedUid: 'bob' });

    expect(getCollection('users/bob/activity')[0]).toMatchObject({ actorName: 'A player' });
  });

  it('does nothing if the followed user somehow no longer exists', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice' });

    await handlers.onFollowed({ followerUid: 'alice', followedUid: 'nobody' });

    expect(getCollection('users/nobody/activity')).toHaveLength(0);
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });
});

function makeRoom({ hostUid, playerUids, code = 'TEST', status = 'waiting' }) {
  return {
    gameType: 'love-letter',
    code,
    hostUid,
    status,
    playerUids,
    players: playerUids.map((uid, seat) => ({ uid, displayName: uid === hostUid ? 'Alice' : uid, seat })),
  };
}

describe('onRoomPlayersChanged', () => {
  it("notifies the host and logs activity when someone new joins the host's room", async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice', pushTokens: ['tok-alice'] });

    const before = makeRoom({ hostUid: 'alice', playerUids: ['alice'] });
    const after = makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] });

    await handlers.onRoomPlayersChanged({ roomId: 'room1', before, after });

    const activity = getCollection('users/alice/activity');
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      type: 'player_joined',
      playerUid: 'bob',
      playerName: 'bob',
      roomId: 'room1',
      roomCode: 'TEST',
    });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['tok-alice']);
  });

  it('does nothing when playerUids shrinks (someone left) or is unchanged', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice', pushTokens: ['tok-alice'] });

    const before = makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] });
    const afterLeft = makeRoom({ hostUid: 'alice', playerUids: ['alice'] });
    const afterUnchanged = makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'], status: 'waiting' });

    await handlers.onRoomPlayersChanged({ roomId: 'room1', before, after: afterLeft });
    await handlers.onRoomPlayersChanged({ roomId: 'room1', before, after: afterUnchanged });

    expect(getCollection('users/alice/activity')).toHaveLength(0);
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('does not notify the host about themselves joining', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice', pushTokens: ['tok-alice'] });

    const before = makeRoom({ hostUid: 'alice', playerUids: [] });
    const after = makeRoom({ hostUid: 'alice', playerUids: ['alice'] });

    await handlers.onRoomPlayersChanged({ roomId: 'room1', before, after });

    expect(getCollection('users/alice/activity')).toHaveLength(0);
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });
});

describe('inviteToRoom', () => {
  function callAs(uid, data) {
    return { auth: { uid }, data };
  }

  it('writes an invite activity entry and pushes a notification to the invitee', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { displayName: 'Alice' });
    setDoc('users/cleo', { displayName: 'Cleo', pushTokens: ['tok-cleo'] });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    const result = await handlers.inviteToRoom(callAs('alice', { roomId: 'room1', targetUid: 'cleo' }));

    expect(result).toEqual({ success: true });
    expect(getCollection('users/cleo/activity')[0]).toMatchObject({
      type: 'invite',
      roomId: 'room1',
      roomCode: 'TEST',
      inviterUid: 'alice',
      inviterName: 'Alice',
    });
    expect(messaging.sendEachForMulticast.mock.calls[0][0]).toMatchObject({
      tokens: ['tok-cleo'],
      notification: { title: 'Game invite!', body: 'Alice invited you to Love Letter — Room TEST.' },
    });
  });

  it('lets any current room member invite, not just the host', async () => {
    const { db, setDoc, getCollection } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/alice', { displayName: 'Alice' });
    setDoc('users/bob', { displayName: 'bob' });
    setDoc('users/cleo', { displayName: 'Cleo' });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.inviteToRoom(callAs('bob', { roomId: 'room1', targetUid: 'cleo' }));

    expect(getCollection('users/cleo/activity')[0]).toMatchObject({ inviterUid: 'bob', inviterName: 'bob' });
  });

  it('rejects an invite from someone not in the room', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/cleo', { displayName: 'Cleo' });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.inviteToRoom(callAs('eve', { roomId: 'room1', targetUid: 'cleo' }))).rejects.toThrow(
      "You're not in this room."
    );
  });

  it('rejects an invite once the game has already started', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/cleo', { displayName: 'Cleo' });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'], status: 'active' }));

    await expect(handlers.inviteToRoom(callAs('alice', { roomId: 'room1', targetUid: 'cleo' }))).rejects.toThrow(
      'This game has already started.'
    );
  });

  it('rejects an invite for someone already in the room', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.inviteToRoom(callAs('alice', { roomId: 'room1', targetUid: 'bob' }))).rejects.toThrow(
      'That player is already in the room.'
    );
  });

  it('rejects inviting yourself', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice'] }));

    await expect(handlers.inviteToRoom(callAs('alice', { roomId: 'room1', targetUid: 'alice' }))).rejects.toThrow(
      "You can't invite yourself."
    );
  });

  it('rejects an invite to a player who has blocked the inviter', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/cleo', { displayName: 'Cleo' });
    setDoc('users/cleo/blocks/alice', { since: new Date() });
    setDoc('gameRooms/room1', makeRoom({ hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.inviteToRoom(callAs('alice', { roomId: 'room1', targetUid: 'cleo' }))).rejects.toThrow(
      "You can't invite that player."
    );
  });
});

describe('onBlocked', () => {
  it("removes the blocked user from the blocker's following list", async () => {
    const { db, setDoc, getDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/alice/follows/bob', { since: new Date() });

    await handlers.onBlocked({ blockerUid: 'alice', blockedUid: 'bob' });

    expect(getDoc('users/alice/follows/bob')).toBeUndefined();
  });

  it("also removes the blocker from the blocked user's following list (severs both directions)", async () => {
    const { db, setDoc, getDoc } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('users/bob/follows/alice', { since: new Date() });

    await handlers.onBlocked({ blockerUid: 'alice', blockedUid: 'bob' });

    expect(getDoc('users/bob/follows/alice')).toBeUndefined();
  });

  it('is a no-op (does not throw) when neither follow relationship exists', async () => {
    const { db } = createFakeFirestore();
    const handlers = createSocialHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });

    await expect(handlers.onBlocked({ blockerUid: 'alice', blockedUid: 'bob' })).resolves.toBeUndefined();
  });
});
