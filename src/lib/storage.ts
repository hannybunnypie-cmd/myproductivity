import { Task, Category, Goal, Habit, HabitLog, JournalEntry, UserXP, UserPreferences } from './types';

const STORAGE_KEY_PREFIX = 'productivity_app_v2_';

function getKey(userEmail: string | undefined, keyName: string): string {
  const cleanEmail = (userEmail || 'guest').toLowerCase().trim();
  return `${STORAGE_KEY_PREFIX}${cleanEmail}_${keyName}`;
}

export function getLocalStore<T>(email: string | undefined, keyName: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(getKey(email, keyName));
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('LocalStore read error:', e);
    return defaultValue;
  }
}

export function setLocalStore<T>(email: string | undefined, keyName: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(email, keyName), JSON.stringify(value));
  } catch (e) {
    console.error('LocalStore write error:', e);
  }
}

// Default pre-seeded categories for new users
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_academics', user_id: 'default', name: 'Study / Academics', color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 'cat_coding', user_id: 'default', name: 'Coding & Projects', color: '#10b981', created_at: new Date().toISOString() },
  { id: 'cat_personal', user_id: 'default', name: 'Personal Development', color: '#8b5cf6', created_at: new Date().toISOString() },
  { id: 'cat_health', user_id: 'default', name: 'Health & Wellness', color: '#f59e0b', created_at: new Date().toISOString() },
];
