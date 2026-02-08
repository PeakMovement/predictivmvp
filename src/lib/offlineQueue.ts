interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = "offline_actions";
const MAX_RETRIES = 3;

export const offlineQueue = {
  add: (type: string, data: any): string => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = offlineQueue.getAll();
    queue.push(action);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    return action.id;
  },

  getAll: (): OfflineAction[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  remove: (id: string): void => {
    const queue = offlineQueue.getAll().filter((action) => action.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  process: async (
    handler: (action: OfflineAction) => Promise<boolean>
  ): Promise<void> => {
    const queue = offlineQueue.getAll();

    for (const action of queue) {
      try {
        const success = await handler(action);

        if (success) {
          offlineQueue.remove(action.id);
        } else {
          if (action.retries < MAX_RETRIES) {
            const updated = offlineQueue.getAll().map((a) =>
              a.id === action.id ? { ...a, retries: a.retries + 1 } : a
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } else {
            console.error(
              `Action ${action.id} failed after ${MAX_RETRIES} retries`,
              action
            );
            offlineQueue.remove(action.id);
          }
        }
      } catch (error) {
        console.error("Error processing offline action:", error);
      }
    }
  },

  count: (): number => {
    return offlineQueue.getAll().length;
  },
};

export const setupOfflineSync = () => {
  window.addEventListener("online", async () => {
    console.log("Back online! Processing queued actions...");

    await offlineQueue.process(async (action) => {
      console.log("Processing action:", action.type, action.data);
      return true;
    });
  });
};
