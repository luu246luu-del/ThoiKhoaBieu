/**
 * Safe storage wrapper supporting both Browser and Node.js / SSR execution environments.
 */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStore.get(key) || null;
      }
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return memoryStore.get(key) || null;
      }
    }
    return memoryStore.get(key) || null;
  },

  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        memoryStore.set(key, value);
        return;
      }
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        globalThis.localStorage.setItem(key, value);
        return;
      } catch {
        memoryStore.set(key, value);
        return;
      }
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        memoryStore.delete(key);
        return;
      }
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        globalThis.localStorage.removeItem(key);
        return;
      } catch {
        memoryStore.delete(key);
        return;
      }
    }
    memoryStore.delete(key);
  },

  clear(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch {
        // ignore
      }
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        globalThis.localStorage.clear();
      } catch {
        // ignore
      }
    }
    memoryStore.clear();
  },
};
