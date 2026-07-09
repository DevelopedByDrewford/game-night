import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createHandlers } from './lib/handlers.js';
import { createSocialHandlers } from './lib/social.js';

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const handlers = createHandlers({ db, FieldValue, messaging });
const socialHandlers = createSocialHandlers({ db, FieldValue, messaging });

export const startGame = onCall(handlers.startGame);
export const playCard = onCall(handlers.playCard);
export const resolveChancellor = onCall(handlers.resolveChancellor);

export const onFollowCreated = onDocumentCreated('users/{followerUid}/follows/{followedUid}', (event) =>
  socialHandlers.onFollowed({
    followerUid: event.params.followerUid,
    followedUid: event.params.followedUid,
  })
);
