// The playground's lab frame is sandboxed without allow-same-origin, where reading localStorage throws.
// SciChart reads it while its modules load, so this in-memory stand-in is imported before any chart library.
try {
  void window.localStorage;
} catch {
  const items = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: key => items.get(key) ?? null,
    key: index => [...items.keys()][index] ?? null,
    removeItem: key => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
  Object.defineProperty(window, 'localStorage', { value: memory, configurable: true });
}

export {};
