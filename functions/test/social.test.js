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
