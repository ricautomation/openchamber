import { describe, expect, test, beforeEach, afterEach, spyOn, mock } from 'bun:test';

// Mock store before importing the module
const mockStore = {
  setShowReasoningTraces: (val: boolean) => {}
};

mock.module('@/stores/useUIStore', () => ({
  useUIStore: {
    getState: () => mockStore,
  },
}));

import { loadAppearancePreferences, saveAppearancePreferences, applyAppearancePreferences, type AppearancePreferences } from './appearancePersistence';

describe('appearancePersistence', () => {
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
  })();

  beforeEach(() => {
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
    };
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  describe('loadAppearancePreferences', () => {
    test('returns null when window is undefined', async () => {
      delete (globalThis as any).window;
      const result = await loadAppearancePreferences();
      expect(result).toBeNull();
    });

    test('returns null when no data in localStorage', async () => {
      const result = await loadAppearancePreferences();
      expect(result).toBeNull();
    });

    test('returns valid preferences from localStorage', async () => {
      const prefs: AppearancePreferences = { showReasoningTraces: true };
      mockLocalStorage.setItem('appearance-preferences', JSON.stringify(prefs));

      const result = await loadAppearancePreferences();
      expect(result).toEqual(prefs);
    });

    test('returns null and catches error when localStorage has invalid JSON', async () => {
      mockLocalStorage.setItem('appearance-preferences', '{invalid json}');

      const result = await loadAppearancePreferences();
      expect(result).toBeNull();
    });

    test('sanitizes preferences and returns valid parts', async () => {
      const mixedData = {
        showReasoningTraces: false,
        unknownField: 'value',
        anotherInvalid: 123
      };
      mockLocalStorage.setItem('appearance-preferences', JSON.stringify(mixedData));

      const result = await loadAppearancePreferences();
      expect(result).toEqual({ showReasoningTraces: false });
    });

    test('returns null when showReasoningTraces is not a boolean', async () => {
      const invalidData = {
        showReasoningTraces: 'not-a-boolean'
      };
      mockLocalStorage.setItem('appearance-preferences', JSON.stringify(invalidData));

      const result = await loadAppearancePreferences();
      expect(result).toBeNull();
    });
  });

  describe('saveAppearancePreferences', () => {
    test('returns false when window is undefined', () => {
      delete (globalThis as any).window;
      const result = saveAppearancePreferences({ showReasoningTraces: true });
      expect(result).toBe(false);
    });

    test('saves preferences to localStorage and returns true', () => {
      const prefs: AppearancePreferences = { showReasoningTraces: true };
      const result = saveAppearancePreferences(prefs);

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem('appearance-preferences')).toBe(JSON.stringify(prefs));
    });

    test('returns false if localStorage.setItem throws', () => {
      spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = saveAppearancePreferences({ showReasoningTraces: true });
      expect(result).toBe(false);
    });
  });

  describe('applyAppearancePreferences', () => {
    test('calls setShowReasoningTraces when preferences contains it', () => {
      const spy = spyOn(mockStore, 'setShowReasoningTraces');

      applyAppearancePreferences({ showReasoningTraces: true });
      expect(spy).toHaveBeenCalledWith(true);
      spy.mockRestore();
    });

    test('does not call setShowReasoningTraces when preferences does not contain it', () => {
      const spy = spyOn(mockStore, 'setShowReasoningTraces');

      applyAppearancePreferences({});
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
