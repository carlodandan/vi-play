import type { MediaItem } from '../types/media.ts';

export interface WatchHistoryItem {
  item: MediaItem;
  season?: number;
  episode?: number;
  timestamp: number;
  progressPercent: number; // e.g. 60
}

const STORAGE_KEY = 'vplay_watch_history';
export const HISTORY_CHANGE_EVENT = 'vplay_history_updated';

function notifyHistoryChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HISTORY_CHANGE_EVENT));
  }
}

export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchHistory(
  item: MediaItem,
  season?: number,
  episode?: number,
  progressPercent = 35
) {
  try {
    const history = getWatchHistory();
    const existingIndex = history.findIndex(
      (h) =>
        h.item.id === item.id &&
        h.season === season &&
        h.episode === episode
    );

    const entry: WatchHistoryItem = {
      item,
      season,
      episode,
      timestamp: Date.now(),
      progressPercent,
    };

    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    history.unshift(entry);

    // Keep top 12 items
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
    notifyHistoryChanged();
  } catch {
    // Ignore storage quota
  }
}

export function clearWatchHistoryItem(id: number, season?: number, episode?: number) {
  try {
    const history = getWatchHistory().filter(
      (h) =>
        !(
          h.item.id === id &&
          h.season === season &&
          h.episode === episode
        )
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    notifyHistoryChanged();
  } catch {
    // Ignore storage quota
  }
}
