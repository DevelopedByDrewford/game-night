// One-off seed script for gameCatalog/*. Run with: npm run seed:catalog
//
// gameCatalog is read-only from client code (see firestore.rules), so
// seeding it needs the Admin SDK, not the client SDK used everywhere else
// in this app. Before running:
//   1. Firebase console > Project settings > Service accounts > Generate new private key
//   2. Save the downloaded file as serviceAccountKey.json in the project root (gitignored)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error(
    `Couldn't read ${serviceAccountPath}.\n` +
      'Download a service account key from Firebase console > Project settings > ' +
      'Service accounts > Generate new private key, and save it there.'
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const games = {
  'love-letter': { displayName: 'Love Letter', minPlayers: 2, maxPlayers: 8, active: true, icon: '💌' },
  connect4: { displayName: 'Connect 4', minPlayers: 2, maxPlayers: 2, active: false, icon: '🔴' },
  mancala: { displayName: 'Mancala', minPlayers: 2, maxPlayers: 2, active: false, icon: '🟤' },
};

for (const [id, data] of Object.entries(games)) {
  await db.collection('gameCatalog').doc(id).set(data, { merge: true });
  console.log(`Seeded gameCatalog/${id}`);
}

console.log('Done.');
process.exit(0);
