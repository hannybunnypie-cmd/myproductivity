import { getDb, MASTER_ACHIEVEMENTS } from './db';
import { UserXP, Achievement, UserAchievement } from './types';
import { calculateStreaks } from './stats';

export function getUserXP(userId: string): UserXP {
  const db = getDb();
  let xp = db.prepare('SELECT total_xp, level FROM user_xp WHERE user_id = ?').get(userId) as
    | { total_xp: number; level: number }
    | undefined;

  if (!xp) {
    db.prepare('INSERT INTO user_xp (user_id, total_xp, level) VALUES (?, 0, 1)').run(userId);
    return { user_id: userId, total_xp: 0, level: 1 };
  }

  return { user_id: userId, total_xp: xp.total_xp, level: xp.level };
}

export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 40)) + 1;
}

export function calculateXPForNextLevel(level: number): { currentLevelXP: number; nextLevelXP: number } {
  // Level L threshold = 40 * (L - 1)^2
  const currentLevelXP = 40 * Math.pow(level - 1, 2);
  const nextLevelXP = 40 * Math.pow(level, 2);
  return { currentLevelXP, nextLevelXP };
}

export function awardXP(
  userId: string,
  amount: number
): {
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedAchievements: Achievement[];
} {
  const db = getDb();
  const current = getUserXP(userId);

  const newTotalXP = current.total_xp + amount;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > current.level;

  db.prepare('UPDATE user_xp SET total_xp = ?, level = ? WHERE user_id = ?').run(
    newTotalXP,
    newLevel,
    userId
  );

  const unlockedAchievements = checkAndUnlockAchievements(userId);

  return {
    newTotalXP,
    newLevel,
    leveledUp,
    unlockedAchievements,
  };
}

export function checkAndUnlockAchievements(userId: string): Achievement[] {
  const db = getDb();

  // Fetch already unlocked achievement keys
  const unlockedRows = db
    .prepare(
      `SELECT a.key FROM user_achievements ua JOIN achievements a ON ua.achievement_id = a.id WHERE ua.user_id = ?`
    )
    .all(userId) as { key: string }[];
  const unlockedKeys = new Set(unlockedRows.map((r) => r.key));

  // Compute real activity metrics for user
  const tasksCompletedRes = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed'`)
    .get(userId) as { count: number };
  const tasksCompleted = tasksCompletedRes?.count || 0;

  const pomodoroCompletedRes = db
    .prepare(`SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = 1`)
    .get(userId) as { count: number };
  const pomodoroCompleted = pomodoroCompletedRes?.count || 0;

  const medCompletedRes = db
    .prepare(`SELECT COUNT(*) as count FROM meditation_sessions WHERE user_id = ? AND completed = 1`)
    .get(userId) as { count: number };
  const medCompleted = medCompletedRes?.count || 0;

  const habitsLoggedRes = db
    .prepare(`SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ?`)
    .get(userId) as { count: number };
  const habitsLogged = habitsLoggedRes?.count || 0;

  const journalEntriesRes = db
    .prepare(`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?`)
    .get(userId) as { count: number };
  const journalEntries = journalEntriesRes?.count || 0;

  const goalsCompletedRes = db
    .prepare(`SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND current_amount >= target_amount AND target_amount > 0`)
    .get(userId) as { count: number };
  const goalsCompleted = goalsCompletedRes?.count || 0;

  const { currentStreak, longestStreak } = calculateStreaks(userId);
  const userXP = getUserXP(userId);

  const newlyUnlocked: Achievement[] = [];

  const checkKey = (key: string, condition: boolean) => {
    if (condition && !unlockedKeys.has(key)) {
      const ach = db.prepare(`SELECT * FROM achievements WHERE key = ?`).get(key) as Achievement | undefined;
      if (ach) {
        const achId = ach.id;
        const now = new Date().toISOString();
        db.prepare(
          `INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)`
        ).run(`ua_${userId}_${key}`, userId, achId, now);

        newlyUnlocked.push(ach);
      }
    }
  };

  // Evaluate conditions strictly from user data
  checkKey('first_step', tasksCompleted >= 1);
  checkKey('getting_started', tasksCompleted >= 5);
  checkKey('focused', pomodoroCompleted >= 5);
  checkKey('consistency', longestStreak >= 7 || currentStreak >= 7);
  checkKey('dedicated', longestStreak >= 30 || currentStreak >= 30);
  checkKey('study_mode', pomodoroCompleted + medCompleted >= 10);
  checkKey('zen_master', medCompleted >= 5);
  checkKey('goal_getter', goalsCompleted >= 1);
  checkKey('habit_builder', habitsLogged >= 5);
  checkKey('reflection', journalEntries >= 3);
  checkKey('level_up', userXP.level >= 5);

  return newlyUnlocked;
}

export function getUserAchievementsWithStatus(userId: string): {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // 0 to 100
}[] {
  const db = getDb();

  const allAchievements = db.prepare(`SELECT * FROM achievements`).all() as Achievement[];
  const userUnlocks = db
    .prepare(`SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?`)
    .all(userId) as { achievement_id: string; unlocked_at: string }[];

  const unlockMap = new Map<string, string>();
  for (const u of userUnlocks) {
    unlockMap.set(u.achievement_id, u.unlocked_at);
  }

  // Activity counts for progress bar display
  const tasksCompleted = (db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed'`).get(userId) as any)?.count || 0;
  const pomodoroCompleted = (db.prepare(`SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = 1`).get(userId) as any)?.count || 0;
  const medCompleted = (db.prepare(`SELECT COUNT(*) as count FROM meditation_sessions WHERE user_id = ? AND completed = 1`).get(userId) as any)?.count || 0;
  const habitsLogged = (db.prepare(`SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ?`).get(userId) as any)?.count || 0;
  const journalEntries = (db.prepare(`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?`).get(userId) as any)?.count || 0;
  const goalsCompleted = (db.prepare(`SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND current_amount >= target_amount AND target_amount > 0`).get(userId) as any)?.count || 0;
  const { longestStreak } = calculateStreaks(userId);
  const userXP = getUserXP(userId);

  return allAchievements.map((ach) => {
    const unlockedAt = unlockMap.get(ach.id) || null;
    const unlocked = Boolean(unlockedAt);

    let progress = 0;
    if (unlocked) {
      progress = 100;
    } else {
      switch (ach.key) {
        case 'first_step':
          progress = Math.min(100, Math.round((tasksCompleted / 1) * 100));
          break;
        case 'getting_started':
          progress = Math.min(100, Math.round((tasksCompleted / 5) * 100));
          break;
        case 'focused':
          progress = Math.min(100, Math.round((pomodoroCompleted / 5) * 100));
          break;
        case 'consistency':
          progress = Math.min(100, Math.round((longestStreak / 7) * 100));
          break;
        case 'dedicated':
          progress = Math.min(100, Math.round((longestStreak / 30) * 100));
          break;
        case 'study_mode':
          progress = Math.min(100, Math.round(((pomodoroCompleted + medCompleted) / 10) * 100));
          break;
        case 'zen_master':
          progress = Math.min(100, Math.round((medCompleted / 5) * 100));
          break;
        case 'goal_getter':
          progress = Math.min(100, Math.round((goalsCompleted / 1) * 100));
          break;
        case 'habit_builder':
          progress = Math.min(100, Math.round((habitsLogged / 5) * 100));
          break;
        case 'reflection':
          progress = Math.min(100, Math.round((journalEntries / 3) * 100));
          break;
        case 'level_up':
          progress = Math.min(100, Math.round((userXP.level / 5) * 100));
          break;
        default:
          progress = 0;
      }
    }

    return {
      achievement: ach,
      unlocked,
      unlockedAt,
      progress,
    };
  });
}
