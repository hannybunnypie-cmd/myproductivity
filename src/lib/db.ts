import path from 'path';
import fs from 'fs';
import {
  User,
  UserPreferences,
  Category,
  Goal,
  Task,
  Subtask,
  Habit,
  HabitLog,
  PomodoroSession,
  MeditationSession,
  JournalEntry,
  WeeklyReview,
  UserXP,
  Achievement,
  UserAchievement,
} from './types';

export const MASTER_ACHIEVEMENTS: Omit<Achievement, 'id'>[] = [
  { key: 'first_step', title: 'First Step', description: 'Complete your first task', icon: 'CheckCircle2', xp_reward: 50 },
  { key: 'getting_started', title: 'Getting Started', description: 'Complete 5 tasks', icon: 'CheckCheck', xp_reward: 100 },
  { key: 'focused', title: 'Focused Mind', description: 'Complete 5 Pomodoro sessions', icon: 'Timer', xp_reward: 100 },
  { key: 'consistency', title: 'Consistency', description: 'Maintain a 7-day productivity streak', icon: 'Flame', xp_reward: 150 },
  { key: 'dedicated', title: 'Dedicated Master', description: 'Maintain a 30-day productivity streak', icon: 'Zap', xp_reward: 300 },
  { key: 'study_mode', title: 'Study Mode', description: 'Complete 10 study or focus sessions', icon: 'BookOpen', xp_reward: 150 },
  { key: 'zen_master', title: 'Zen Master', description: 'Complete 5 meditation or breathing sessions', icon: 'Heart', xp_reward: 100 },
  { key: 'goal_getter', title: 'Goal Getter', description: 'Reach 100% on a major goal', icon: 'Target', xp_reward: 150 },
  { key: 'habit_builder', title: 'Habit Builder', description: 'Log 5 habit completions', icon: 'CalendarCheck', xp_reward: 100 },
  { key: 'reflection', title: 'Mindful Thinker', description: 'Write 3 daily reflection journal entries', icon: 'FileText', xp_reward: 100 },
  { key: 'level_up', title: 'High Achiever', description: 'Reach Level 5', icon: 'Trophy', xp_reward: 200 },
  { key: 'comeback', title: 'The Comeback', description: 'Complete a task after returning', icon: 'Sparkles', xp_reward: 100 },
];

interface SchemaStore {
  users: User[];
  user_preferences: any[];
  categories: Category[];
  goals: Goal[];
  tasks: Task[];
  subtasks: Subtask[];
  habits: Habit[];
  habit_logs: HabitLog[];
  pomodoro_sessions: PomodoroSession[];
  meditation_sessions: MeditationSession[];
  journal_entries: JournalEntry[];
  weekly_reviews: WeeklyReview[];
  user_xp: UserXP[];
  achievements: Achievement[];
  user_achievements: UserAchievement[];
}

let storeMemory: SchemaStore | null = null;

function getStoreFilePath(): string {
  const isVercel = process.env.VERCEL === '1';
  const dbDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'productivity_store.json');
}

function loadStore(): SchemaStore {
  if (storeMemory) return storeMemory;

  const filePath = getStoreFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      storeMemory = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read json store, resetting store:', e);
      storeMemory = createEmptyStore();
    }
  } else {
    storeMemory = createEmptyStore();
  }

  // Populate achievements if empty
  if (!storeMemory!.achievements || storeMemory!.achievements.length === 0) {
    storeMemory!.achievements = MASTER_ACHIEVEMENTS.map((ach) => ({
      id: 'ach_' + ach.key,
      ...ach,
    }));
    saveStore();
  }

  return storeMemory!;
}

function saveStore() {
  if (!storeMemory) return;
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(storeMemory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write store file:', err);
  }
}

function createEmptyStore(): SchemaStore {
  return {
    users: [],
    user_preferences: [],
    categories: [],
    goals: [],
    tasks: [],
    subtasks: [],
    habits: [],
    habit_logs: [],
    pomodoro_sessions: [],
    meditation_sessions: [],
    journal_entries: [],
    weekly_reviews: [],
    user_xp: [],
    achievements: MASTER_ACHIEVEMENTS.map((ach) => ({ id: 'ach_' + ach.key, ...ach })),
    user_achievements: [],
  };
}

// Pure JS Database Helper Class
class SimpleDb {
  exec(sql: string) {
    loadStore();
  }

  prepare(sql: string) {
    const s = loadStore();
    const sqlTrim = sql.trim().replace(/\s+/g, ' ');

    return {
      get: (...params: any[]) => {
        // SELECT users by email
        if (sqlTrim.includes('SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?') || sqlTrim.includes('FROM users WHERE email = ?')) {
          const email = params[0];
          return s.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        }
        // SELECT user by id
        if (sqlTrim.includes('FROM users WHERE id = ?')) {
          const id = params[0];
          return s.users.find((u) => u.id === id);
        }
        // COUNT users
        if (sqlTrim.includes('SELECT COUNT(*) as cnt FROM achievements')) {
          return { cnt: s.achievements.length };
        }
        // SELECT user_preferences
        if (sqlTrim.includes('FROM user_preferences WHERE user_id = ?')) {
          const userId = params[0];
          return s.user_preferences.find((p) => p.user_id === userId);
        }
        // SELECT user_xp
        if (sqlTrim.includes('FROM user_xp WHERE user_id = ?')) {
          const userId = params[0];
          return s.user_xp.find((x) => x.user_id === userId);
        }
        // SELECT single task
        if (sqlTrim.includes('FROM tasks WHERE id = ?')) {
          const id = params[0];
          const userId = params[1];
          return s.tasks.find((t) => t.id === id && (!userId || t.user_id === userId));
        }
        // SELECT single subtask
        if (sqlTrim.includes('FROM subtasks WHERE id = ?')) {
          const id = params[0];
          return s.subtasks.find((st) => st.id === id);
        }
        // SELECT single category
        if (sqlTrim.includes('FROM categories WHERE id = ?')) {
          const id = params[0];
          return s.categories.find((c) => c.id === id);
        }
        // SELECT single goal
        if (sqlTrim.includes('FROM goals WHERE id = ?')) {
          const id = params[0];
          return s.goals.find((g) => g.id === id);
        }
        // SELECT single habit log
        if (sqlTrim.includes('FROM habit_logs WHERE user_id = ? AND habit_id = ? AND logged_date = ?')) {
          const [userId, habitId, dateStr] = params;
          return s.habit_logs.find((hl) => hl.user_id === userId && hl.habit_id === habitId && hl.logged_date === dateStr);
        }
        // SELECT single habit
        if (sqlTrim.includes('FROM habits WHERE id = ?')) {
          const id = params[0];
          return s.habits.find((h) => h.id === id);
        }
        // SELECT journal entry
        if (sqlTrim.includes('FROM journal_entries WHERE user_id = ? AND entry_date = ?')) {
          const [userId, dateStr] = params;
          return s.journal_entries.find((j) => j.user_id === userId && j.entry_date === dateStr);
        }
        // SELECT weekly review
        if (sqlTrim.includes('FROM weekly_reviews WHERE user_id = ? AND week_start_date = ?')) {
          const [userId, weekStart] = params;
          return s.weekly_reviews.find((w) => w.user_id === userId && w.week_start_date === weekStart);
        }
        // Aggregate queries
        if (sqlTrim.includes('SUM(duration_mins)') && sqlTrim.includes('pomodoro_sessions')) {
          const userId = params[0];
          const dateStr = params[1];
          const categoryId = params[1];
          let matching = s.pomodoro_sessions.filter((p) => p.user_id === userId && p.completed);
          if (dateStr && dateStr.length === 10) {
            matching = matching.filter((p) => p.started_at.startsWith(dateStr));
          }
          if (sqlTrim.includes('category_id = ?')) {
            matching = matching.filter((p) => p.category_id === categoryId);
          }
          const sum = matching.reduce((acc, curr) => acc + curr.duration_mins, 0);
          return { total_mins: sum, total: sum };
        }
        if (sqlTrim.includes('SUM(duration_mins)') && sqlTrim.includes('meditation_sessions')) {
          const userId = params[0];
          const dateStr = params[1];
          let matching = s.meditation_sessions.filter((m) => m.user_id === userId && m.completed);
          if (dateStr && dateStr.length === 10) {
            matching = matching.filter((m) => m.completed_at.startsWith(dateStr));
          }
          const sum = matching.reduce((acc, curr) => acc + curr.duration_mins, 0);
          return { total_mins: sum };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('habit_logs')) {
          const userId = params[0];
          const param2 = params[1];
          let matching = s.habit_logs.filter((hl) => hl.user_id === userId);
          if (sqlTrim.includes('logged_date = ?')) {
            matching = matching.filter((hl) => hl.logged_date === param2);
          } else if (sqlTrim.includes('habit_id = ?')) {
            matching = matching.filter((hl) => hl.habit_id === param2);
          } else if (sqlTrim.includes('logged_date >= ? AND logged_date <= ?')) {
            const date1 = params[1];
            const date2 = params[2];
            matching = matching.filter((hl) => hl.logged_date >= date1 && hl.logged_date <= date2);
          }
          return { cnt: matching.length, count: matching.length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('tasks')) {
          const userId = params[0];
          let matching = s.tasks.filter((t) => t.user_id === userId);
          if (sqlTrim.includes("status = 'completed'")) {
            matching = matching.filter((t) => t.status === 'completed');
          }
          if (sqlTrim.includes("status = 'postponed'")) {
            matching = matching.filter((t) => t.status === 'postponed');
          }
          if (sqlTrim.includes('category_id = ?')) {
            matching = matching.filter((t) => t.category_id === params[1]);
          }
          if (sqlTrim.includes('date(completed_at) >= ? AND date(completed_at) <= ?')) {
            const d1 = params[1];
            const d2 = params[2];
            matching = matching.filter((t) => t.completed_at && t.completed_at.split('T')[0] >= d1 && t.completed_at.split('T')[0] <= d2);
          }
          if (sqlTrim.includes('due_date >= ? AND due_date <= ?')) {
            const d1 = params[1];
            const d2 = params[2];
            matching = matching.filter((t) => t.due_date >= d1 && t.due_date <= d2);
          }
          return { cnt: matching.length, count: matching.length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('habits')) {
          const userId = params[0];
          return { cnt: s.habits.filter((h) => h.user_id === userId).length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('pomodoro_sessions')) {
          const userId = params[0];
          const dateStr = params[1];
          let matching = s.pomodoro_sessions.filter((p) => p.user_id === userId && p.completed);
          if (dateStr) matching = matching.filter((p) => p.started_at.startsWith(dateStr));
          return { cnt: matching.length, count: matching.length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('meditation_sessions')) {
          const userId = params[0];
          const dateStr = params[1];
          let matching = s.meditation_sessions.filter((m) => m.user_id === userId && m.completed);
          if (dateStr) matching = matching.filter((m) => m.completed_at.startsWith(dateStr));
          return { cnt: matching.length, count: matching.length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('journal_entries')) {
          const userId = params[0];
          return { count: s.journal_entries.filter((j) => j.user_id === userId).length };
        }
        if (sqlTrim.includes('COUNT(*)') && sqlTrim.includes('goals')) {
          const userId = params[0];
          return { count: s.goals.filter((g) => g.user_id === userId && g.current_amount >= g.target_amount && g.target_amount > 0).length };
        }
        if (sqlTrim.includes('SELECT daily_study_target_mins FROM user_preferences')) {
          const userId = params[0];
          return s.user_preferences.find((p) => p.user_id === userId);
        }
        if (sqlTrim.includes('SELECT * FROM achievements WHERE key = ?')) {
          const key = params[0];
          return s.achievements.find((a) => a.key === key);
        }
        if (sqlTrim.includes('SELECT COUNT(*) as sessions, SUM(duration_mins) as mins FROM pomodoro_sessions')) {
          const userId = params[0];
          const d1 = params[1];
          const d2 = params[2];
          const matching = s.pomodoro_sessions.filter((p) => p.user_id === userId && p.completed && p.started_at.split('T')[0] >= d1 && p.started_at.split('T')[0] <= d2);
          const mins = matching.reduce((acc, curr) => acc + curr.duration_mins, 0);
          return { sessions: matching.length, mins };
        }
        return undefined;
      },

      all: (...params: any[]) => {
        // Tasks list
        if (sqlTrim.includes('FROM tasks')) {
          const userId = params[0];
          let list = s.tasks.filter((t) => t.user_id === userId);
          if (sqlTrim.includes('due_date = ?')) {
            const dateStr = params[1];
            list = list.filter((t) => t.due_date === dateStr || (t.completed_at && t.completed_at.split('T')[0] === dateStr));
          }
          if (sqlTrim.includes('status = ?')) {
            const status = params[params.length - 1];
            list = list.filter((t) => t.status === status);
          }
          if (sqlTrim.includes('category_id = ?')) {
            const catId = params[params.length - 1];
            list = list.filter((t) => t.category_id === catId);
          }
          return list.map((t) => {
            const cat = s.categories.find((c) => c.id === t.category_id);
            return {
              ...t,
              category_name: cat?.name,
              category_color: cat?.color,
              tags: Array.isArray(t.tags) ? JSON.stringify(t.tags) : t.tags,
            };
          });
        }
        // Subtasks list
        if (sqlTrim.includes('FROM subtasks')) {
          const taskId = params[0];
          return s.subtasks.filter((st) => st.task_id === taskId);
        }
        // Categories list
        if (sqlTrim.includes('FROM categories')) {
          const userId = params[0];
          return s.categories.filter((c) => c.user_id === userId);
        }
        // Goals list
        if (sqlTrim.includes('FROM goals')) {
          const userId = params[0];
          return s.goals.filter((g) => g.user_id === userId);
        }
        // Habits list
        if (sqlTrim.includes('FROM habits')) {
          const userId = params[0];
          return s.habits.filter((h) => h.user_id === userId);
        }
        // Habit logs
        if (sqlTrim.includes('FROM habit_logs')) {
          const userId = params[0];
          const habitId = params[1];
          let list = s.habit_logs.filter((hl) => hl.user_id === userId);
          if (habitId) list = list.filter((hl) => hl.habit_id === habitId);
          return list;
        }
        // Pomodoro sessions list
        if (sqlTrim.includes('FROM pomodoro_sessions')) {
          const userId = params[0];
          return s.pomodoro_sessions.filter((p) => p.user_id === userId);
        }
        // Meditation sessions list
        if (sqlTrim.includes('FROM meditation_sessions')) {
          const userId = params[0];
          return s.meditation_sessions.filter((m) => m.user_id === userId);
        }
        // Journal entries list
        if (sqlTrim.includes('FROM journal_entries')) {
          const userId = params[0];
          return s.journal_entries.filter((j) => j.user_id === userId);
        }
        // Weekly reviews list
        if (sqlTrim.includes('FROM weekly_reviews')) {
          const userId = params[0];
          return s.weekly_reviews.filter((w) => w.user_id === userId);
        }
        // Task status count
        if (sqlTrim.includes('status, COUNT(*) as count FROM tasks')) {
          const userId = params[0];
          const map = new Map<string, number>();
          s.tasks.filter((t) => t.user_id === userId).forEach((t) => {
            map.set(t.status, (map.get(t.status) || 0) + 1);
          });
          return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
        }
        // Active dates union for streaks
        if (sqlTrim.includes('UNION')) {
          const userId = params[0];
          const dates = new Set<string>();
          s.tasks.filter((t) => t.user_id === userId && t.status === 'completed').forEach((t) => {
            if (t.due_date) dates.add(t.due_date);
            if (t.completed_at) dates.add(t.completed_at.split('T')[0]);
          });
          s.habit_logs.filter((hl) => hl.user_id === userId).forEach((hl) => dates.add(hl.logged_date));
          s.pomodoro_sessions.filter((p) => p.user_id === userId && p.completed).forEach((p) => dates.add(p.started_at.split('T')[0]));
          s.meditation_sessions.filter((m) => m.user_id === userId && m.completed).forEach((m) => dates.add(m.completed_at.split('T')[0]));
          return Array.from(dates).map((date_str) => ({ date_str }));
        }
        // Achievements list
        if (sqlTrim.includes('SELECT * FROM achievements')) {
          return s.achievements;
        }
        if (sqlTrim.includes('FROM user_achievements')) {
          const userId = params[0];
          return s.user_achievements.filter((ua) => ua.user_id === userId);
        }
        return [];
      },

      run: (...params: any[]) => {
        // Insert User
        if (sqlTrim.includes('INSERT INTO users')) {
          const [id, email, name, password_hash, created_at] = params;
          s.users.push({ id, email, name, password_hash, created_at });
          saveStore();
          return;
        }
        // Update user
        if (sqlTrim.includes('UPDATE users SET name = ?')) {
          const [name, id] = params;
          const u = s.users.find((x) => x.id === id);
          if (u) u.name = name;
          saveStore();
          return;
        }
        // Delete user
        if (sqlTrim.includes('DELETE FROM users WHERE id = ?')) {
          const id = params[0];
          s.users = s.users.filter((u) => u.id !== id);
          s.tasks = s.tasks.filter((t) => t.user_id !== id);
          s.habits = s.habits.filter((h) => h.user_id !== id);
          s.user_preferences = s.user_preferences.filter((p) => p.user_id !== id);
          saveStore();
          return;
        }
        // Preferences Insert/Update
        if (sqlTrim.includes('INSERT INTO user_preferences')) {
          const userId = params[0];
          s.user_preferences.push({
            user_id: userId,
            onboarded: 0,
            focus_areas: '[]',
            study_areas: '[]',
            daily_study_target_mins: 120,
            preferred_study_time: 'morning',
            track_meditation: 1,
            use_pomodoro: 1,
            pomodoro_work_mins: 25,
            pomodoro_short_break_mins: 5,
            pomodoro_long_break_mins: 15,
            timezone: 'UTC',
            theme: 'dark',
          });
          saveStore();
          return;
        }
        if (sqlTrim.includes('UPDATE user_preferences SET')) {
          const userId = params[params.length - 1];
          const pref = s.user_preferences.find((p) => p.user_id === userId);
          if (pref) {
            const [onboarded, focus_areas, study_areas, daily_study_target_mins, preferred_study_time, track_meditation, use_pomodoro, pomodoro_work_mins, pomodoro_short_break_mins, pomodoro_long_break_mins, timezone, theme] = params;
            if (onboarded !== null && onboarded !== undefined) pref.onboarded = onboarded;
            if (focus_areas !== null && focus_areas !== undefined) pref.focus_areas = focus_areas;
            if (study_areas !== null && study_areas !== undefined) pref.study_areas = study_areas;
            if (daily_study_target_mins !== null && daily_study_target_mins !== undefined) pref.daily_study_target_mins = daily_study_target_mins;
            if (preferred_study_time !== null && preferred_study_time !== undefined) pref.preferred_study_time = preferred_study_time;
            if (track_meditation !== null && track_meditation !== undefined) pref.track_meditation = track_meditation;
            if (use_pomodoro !== null && use_pomodoro !== undefined) pref.use_pomodoro = use_pomodoro;
            if (pomodoro_work_mins !== null && pomodoro_work_mins !== undefined) pref.pomodoro_work_mins = pomodoro_work_mins;
            if (pomodoro_short_break_mins !== null && pomodoro_short_break_mins !== undefined) pref.pomodoro_short_break_mins = pomodoro_short_break_mins;
            if (pomodoro_long_break_mins !== null && pomodoro_long_break_mins !== undefined) pref.pomodoro_long_break_mins = pomodoro_long_break_mins;
            if (timezone !== null && timezone !== undefined) pref.timezone = timezone;
            if (theme !== null && theme !== undefined) pref.theme = theme;
          }
          saveStore();
          return;
        }
        // Insert Category
        if (sqlTrim.includes('INSERT INTO categories')) {
          const [id, user_id, name, color, created_at] = params;
          s.categories.push({ id, user_id, name, color, created_at });
          saveStore();
          return;
        }
        // Insert Goal
        if (sqlTrim.includes('INSERT INTO goals')) {
          const [id, user_id, category_id, title, deadline, target_amount, unit, created_at] = params;
          s.goals.push({ id, user_id, category_id, title, deadline, target_amount, current_amount: 0, unit, created_at });
          saveStore();
          return;
        }
        // Update Goal
        if (sqlTrim.includes('UPDATE goals SET')) {
          if (sqlTrim.includes('current_amount = current_amount + 1')) {
            const [goalId, userId] = params;
            const g = s.goals.find((x) => x.id === goalId && x.user_id === userId);
            if (g) g.current_amount += 1;
          } else {
            const [title, current_amount, target_amount, deadline, id, userId] = params;
            const g = s.goals.find((x) => x.id === id && x.user_id === userId);
            if (g) {
              if (title) g.title = title;
              if (current_amount !== undefined) g.current_amount = current_amount;
              if (target_amount !== undefined) g.target_amount = target_amount;
              if (deadline) g.deadline = deadline;
            }
          }
          saveStore();
          return;
        }
        // Insert Task
        if (sqlTrim.includes('INSERT INTO tasks')) {
          const [id, user_id, goal_id, category_id, title, description, priority, due_date, estimated_duration_mins, is_focus_today, recurring_rule, tags, notes, created_at] = params;
          s.tasks.push({
            id,
            user_id,
            goal_id,
            category_id,
            title,
            description,
            priority,
            due_date,
            estimated_duration_mins,
            actual_duration_mins: 0,
            status: 'not_started',
            is_focus_today: Boolean(is_focus_today),
            recurring_rule,
            tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
            notes,
            created_at,
            completed_at: null,
          });
          saveStore();
          return;
        }
        // Update Task
        if (sqlTrim.includes('UPDATE tasks SET')) {
          if (sqlTrim.includes("status = 'completed'")) {
            const [completed_at, id] = params;
            const t = s.tasks.find((x) => x.id === id);
            if (t) {
              t.status = 'completed';
              t.completed_at = completed_at;
            }
          } else if (sqlTrim.includes('actual_duration_mins = actual_duration_mins + ?')) {
            const [mins, id, userId] = params;
            const t = s.tasks.find((x) => x.id === id && x.user_id === userId);
            if (t) t.actual_duration_mins += mins;
          } else {
            const [title, description, priority, status, due_date, estimated_duration_mins, actual_duration_mins, category_id, goal_id, is_focus_today, recurring_rule, tags, notes, completed_at, id, userId] = params;
            const t = s.tasks.find((x) => x.id === id && x.user_id === userId);
            if (t) {
              if (title) t.title = title;
              if (description !== null && description !== undefined) t.description = description;
              if (priority) t.priority = priority;
              if (status) t.status = status;
              if (due_date) t.due_date = due_date;
              if (estimated_duration_mins) t.estimated_duration_mins = estimated_duration_mins;
              if (actual_duration_mins) t.actual_duration_mins = actual_duration_mins;
              if (category_id !== undefined) t.category_id = category_id;
              if (goal_id !== undefined) t.goal_id = goal_id;
              if (is_focus_today !== null && is_focus_today !== undefined) t.is_focus_today = Boolean(is_focus_today);
              if (recurring_rule) t.recurring_rule = recurring_rule;
              if (tags) t.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
              if (notes !== null && notes !== undefined) t.notes = notes;
              t.completed_at = completed_at;
            }
          }
          saveStore();
          return;
        }
        // Delete Task
        if (sqlTrim.includes('DELETE FROM tasks WHERE id = ?')) {
          const [id, userId] = params;
          s.tasks = s.tasks.filter((t) => t.id !== id);
          s.subtasks = s.subtasks.filter((st) => st.task_id !== id);
          saveStore();
          return;
        }
        // Subtask Insert/Update
        if (sqlTrim.includes('INSERT INTO subtasks')) {
          const [id, task_id, user_id, title, completed, created_at] = params;
          s.subtasks.push({ id, task_id, user_id, title, completed: Boolean(completed), created_at, completed_at: null });
          saveStore();
          return;
        }
        if (sqlTrim.includes('UPDATE subtasks SET completed = ?')) {
          const [completed, completed_at, id] = params;
          const st = s.subtasks.find((x) => x.id === id);
          if (st) {
            st.completed = Boolean(completed);
            st.completed_at = completed_at;
          }
          saveStore();
          return;
        }
        // Habit Insert/Toggle/Log
        if (sqlTrim.includes('INSERT INTO habits')) {
          const [id, user_id, name, frequency, target_days_per_week, reminder_time, start_date, created_at] = params;
          s.habits.push({ id, user_id, name, frequency, target_days_per_week, reminder_time, start_date, created_at });
          saveStore();
          return;
        }
        if (sqlTrim.includes('INSERT INTO habit_logs')) {
          const [id, user_id, habit_id, logged_date, notes, created_at] = params;
          s.habit_logs.push({ id, user_id, habit_id, logged_date, notes, created_at });
          saveStore();
          return;
        }
        if (sqlTrim.includes('DELETE FROM habit_logs WHERE id = ?')) {
          const id = params[0];
          s.habit_logs = s.habit_logs.filter((hl) => hl.id !== id);
          saveStore();
          return;
        }
        // Pomodoro Insert
        if (sqlTrim.includes('INSERT INTO pomodoro_sessions')) {
          const [id, user_id, task_id, category_id, duration_mins, completed, started_at, ended_at] = params;
          s.pomodoro_sessions.push({ id, user_id, task_id, category_id, duration_mins, completed: Boolean(completed), started_at, ended_at });
          saveStore();
          return;
        }
        // Meditation Insert
        if (sqlTrim.includes('INSERT INTO meditation_sessions')) {
          const [id, user_id, type, duration_mins, completed, completed_at] = params;
          s.meditation_sessions.push({ id, user_id, type, duration_mins, completed: Boolean(completed), completed_at });
          saveStore();
          return;
        }
        // Journal Insert/Update
        if (sqlTrim.includes('INSERT INTO journal_entries')) {
          const [id, user_id, entry_date, accomplishments, distractions, learnings, improvements, created_at, updated_at] = params;
          s.journal_entries.push({ id, user_id, entry_date, accomplishments, distractions, learnings, improvements, created_at, updated_at });
          saveStore();
          return;
        }
        if (sqlTrim.includes('UPDATE journal_entries SET')) {
          const [accomplishments, distractions, learnings, improvements, updated_at, id] = params;
          const j = s.journal_entries.find((x) => x.id === id);
          if (j) {
            j.accomplishments = accomplishments;
            j.distractions = distractions;
            j.learnings = learnings;
            j.improvements = improvements;
            j.updated_at = updated_at;
          }
          saveStore();
          return;
        }
        // Weekly Review Insert/Update
        if (sqlTrim.includes('INSERT INTO weekly_reviews')) {
          const [id, user_id, week_start_date, what_went_well, what_could_improve, focus_next_week, created_at] = params;
          s.weekly_reviews.push({ id, user_id, week_start_date, what_went_well, what_could_improve, focus_next_week, created_at });
          saveStore();
          return;
        }
        if (sqlTrim.includes('UPDATE weekly_reviews SET')) {
          const [what_went_well, what_could_improve, focus_next_week, id] = params;
          const w = s.weekly_reviews.find((x) => x.id === id);
          if (w) {
            w.what_went_well = what_went_well;
            w.what_could_improve = what_could_improve;
            w.focus_next_week = focus_next_week;
          }
          saveStore();
          return;
        }
        // XP Insert/Update
        if (sqlTrim.includes('INSERT INTO user_xp')) {
          const [user_id, total_xp, level] = params;
          s.user_xp.push({ user_id, total_xp, level });
          saveStore();
          return;
        }
        if (sqlTrim.includes('UPDATE user_xp SET')) {
          const [total_xp, level, user_id] = params;
          const x = s.user_xp.find((u) => u.user_id === user_id);
          if (x) {
            x.total_xp = total_xp;
            x.level = level;
          }
          saveStore();
          return;
        }
        // Achievement unlock Insert
        if (sqlTrim.includes('INSERT OR IGNORE INTO user_achievements')) {
          const [id, user_id, achievement_id, unlocked_at] = params;
          if (!s.user_achievements.some((ua) => ua.user_id === user_id && ua.achievement_id === achievement_id)) {
            s.user_achievements.push({ id, user_id, achievement_id, unlocked_at });
          }
          saveStore();
          return;
        }
      },
    };
  }
}

const dbSingleton = new SimpleDb();

export function getDb() {
  return dbSingleton;
}
