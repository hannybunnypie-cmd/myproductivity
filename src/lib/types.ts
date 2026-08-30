export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  onboarded: boolean;
  focus_areas: string[];
  study_areas: string[];
  daily_study_target_mins: number;
  preferred_study_time: string;
  track_meditation: boolean;
  use_pomodoro: boolean;
  pomodoro_work_mins: number;
  pomodoro_short_break_mins: number;
  pomodoro_long_break_mins: number;
  timezone: string;
  theme: 'light' | 'dark';
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  deadline: string;
  target_amount: number;
  current_amount: number;
  unit: string;
  created_at: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed';
export type RecurringRule = 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom';

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  category_id: string | null;
  title: string;
  description: string;
  priority: Priority;
  due_date: string; // YYYY-MM-DD
  estimated_duration_mins: number;
  actual_duration_mins: number;
  status: TaskStatus;
  is_focus_today: boolean;
  recurring_rule: RecurringRule;
  tags: string[];
  notes: string;
  created_at: string;
  completed_at: string | null;
  subtasks?: Subtask[];
  category_name?: string;
  category_color?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  target_days_per_week: number;
  reminder_time: string | null;
  start_date: string;
  created_at: string;
  completed_today?: boolean;
  current_streak?: number;
  total_logs?: number;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  logged_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id: string | null;
  category_id: string | null;
  duration_mins: number;
  completed: boolean;
  started_at: string;
  ended_at: string;
  task_title?: string;
}

export interface MeditationSession {
  id: string;
  user_id: string;
  type: 'meditation' | 'breathing';
  duration_mins: number;
  completed: boolean;
  completed_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  accomplishments: string;
  distractions: string;
  learnings: string;
  improvements: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start_date: string; // YYYY-MM-DD
  what_went_well: string;
  what_could_improve: string;
  focus_next_week: string;
  created_at: string;
}

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface AnalyticsSummary {
  dailyScore: number | null; // null if not enough data
  scoreTrend: { date: string; score: number }[];
  taskMetrics: {
    created: number;
    completed: number;
    postponed: number;
    completionPercentage: number;
  };
  studyMetrics: {
    totalMinutes: number;
    totalSessions: number;
    avgSessionLength: number;
    dailyStudyTime: { date: string; minutes: number }[];
  };
  categoryPerformance: { category: string; color: string; count: number; minutes: number }[];
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    isProductiveToday: boolean;
  };
  habitConsistency: { habitId: string; name: string; percentage: number }[];
  heatmapData: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
  insights: string[];
}
