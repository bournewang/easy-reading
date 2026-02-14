type StorageValue = string | number | boolean | object | null;

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: (key: string, value: StorageValue): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Handle error silently or throw
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Handle error silently or throw
      throw new Error(`Failed to remove from localStorage: ${error}`);
    }
  }
};