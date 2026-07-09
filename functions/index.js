import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createHandlers } from './lib/handlers.js';

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const handlers = createHandlers({ db, FieldValue, messaging });

export const startGame = onCall(handlers.startGame);
export const playCard = onCall(handlers.playCard);
export const resolveChancellor = onCall(handlers.resolveChancellor);
