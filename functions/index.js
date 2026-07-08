import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHandlers } from './lib/handlers.js';

initializeApp();
const db = getFirestore();
const handlers = createHandlers({ db, FieldValue });

export const startGame = onCall(handlers.startGame);
export const playCard = onCall(handlers.playCard);
