// Minimal in-memory stand-in for the Admin SDK Firestore surface our
// handlers actually use (doc/collection refs, transactions with
// get/set/update, FieldValue.increment). Lets functions/lib/handlers.js run
// unmodified in a plain vitest test — no real project, no emulator (which
// needs a JVM this machine doesn't have) required for correctness checks.
function isIncrementSentinel(v) {
  return v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, '__increment');
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !isIncrementSentinel(v);
}

function mergeValue(existing, incoming) {
  if (isIncrementSentinel(incoming)) return (existing || 0) + incoming.__increment;
  if (isPlainObject(incoming)) {
    // Recurse even when `existing` isn't an object yet (e.g. the doc, or
    // this nested field, doesn't exist yet) — otherwise an increment
    // sentinel nested inside a brand-new doc's first merge never resolves.
    const base = isPlainObject(existing) ? existing : {};
    const result = { ...base };
    for (const [k, v] of Object.entries(incoming)) result[k] = mergeValue(base[k], v);
    return result;
  }
  return incoming;
}

export function createFakeFirestore() {
  const store = new Map();
  let autoIdCounter = 0;

  const makeRef = (path) => ({ path, __isRef: true });

  const db = {
    doc: (path) => makeRef(path),
    collection: (path) => ({
      doc: (id) => makeRef(`${path}/${id || `auto${++autoIdCounter}`}`),
    }),
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          const data = store.get(ref.path);
          return { exists: data !== undefined, data: () => data };
        },
        set(ref, data, opts) {
          const existing = store.get(ref.path);
          store.set(ref.path, opts?.merge ? mergeValue(existing || {}, data) : data);
        },
        update(ref, data) {
          store.set(ref.path, mergeValue(store.get(ref.path) || {}, data));
        },
      };
      return fn(tx);
    },
  };

  return {
    db,
    getDoc: (path) => store.get(path),
    setDoc: (path, data) => store.set(path, data),
  };
}

export const fakeFieldValue = {
  increment: (n) => ({ __increment: n }),
  serverTimestamp: () => new Date(),
};
