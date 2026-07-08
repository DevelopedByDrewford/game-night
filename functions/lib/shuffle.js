import { randomInt } from 'node:crypto';

// Fisher-Yates using crypto.randomInt (avoids Math.random's weaker
// distribution/predictability — cheap insurance for a shuffle nobody should
// be able to bias or predict).
export function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
