import { getDb } from './db';
import { AnalyticsSummary, Task, Habit, Category } from './types';

export function calculateDailyProductivityScore(
  userId: string,
  targetDateStr: string // YYYY-MM-DD
): number | null {
  const db = getDb();

  // Fetch tasks for date (due on or completed on date)
  const tasks = db
    .prepare(
      `SELECT status FROM tasks WHERE user_id = ? AND (due_date = ? OR date(completed_at) = ?)`
    )
    .all(userId, targetDateStr, targetDateStr) as { status: string }[];

  // Fetch pomodoro focus minutes for date
  const pomodoroRes = db
    .prepare(
      `SELECT SUM(duration_mins) as total_mins FROM pomodoro_sessions WHERE user_id = ? AND date(started_at) = ? AND completed = 1`
    )
    .get(userId, targetDateStr) as { total_mins: number | null };

  const focusMins = pomodoroRes?.total_mins || 0;

  // Fetch meditation focus minutes
  const medRes = db
    .prepare(
      `SELECT SUM(duration_mins) as total_mins FROM meditation_sessions WHERE user_id = ? AND date(completed_at) = ? AND completed = 1`
    )
    .get(userId, targetDateStr) as { total_mins: number | null };

  const medMins = medRes?.total_mins || 0;
  const totalStudyMins = focusMins + medMins;

  // Fetch habits logged for date
  const habitLogs = db
    .prepare(`SELECT COUNT(*) as cnt FROM habit_logs WHERE user_id = ? AND logged_date = ?`)
    .get(userId, targetDateStr) as { cnt: number };

  const habitCount = habitLogs?.cnt || 0;

  // Total active habits of user
  const totalHabitsRes = db
    .prepare(`SELECT COUNT(*) as cnt FROM habits WHERE user_id = ?`)
    .get(userId) as { cnt: number };
  const totalHabits = totalHabitsRes?.cnt || 0;

  // User study target
  const prefRes = db
    .prepare(`SELECT daily_study_target_mins FROM user_preferences WHERE user_id = ?`)
    .get(userId) as { daily_study_target_mins: number } | undefined;
  const targetMins = prefRes?.daily_study_target_mins || 120;

  // STRICT REQUIREMENT: If 0 tasks planned/completed, 0 study time, and 0 habits logged -> return null (Not enough data yet)
  if (tasks.length === 0 && totalStudyMins === 0 && habitCount === 0) {
    return null;
  }

  // Calculate Weighted Productivity Score:
  // 1. Task Completion (Weight: 45%)
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const taskRatio = tasks.length > 0 ? completedTasks / tasks.length : totalStudyMins > 0 ? 0.8 : 0;
  const taskScore = taskRatio * 45;

  // 2. Study Time vs Target (Weight: 35%)
  const studyRatio = Math.min(1.0, totalStudyMins / Math.max(1, targetMins));
  const studyScore = studyRatio * 35;

  // 3. Habit Consistency (Weight: 20%)
  const habitRatio = totalHabits > 0 ? Math.min(1.0, habitCount / totalHabits) : habitCount > 0 ? 1.0 : 0;
  const habitScore = habitRatio * 20;

  const finalScore = Math.min(100, Math.max(0, Math.round(taskScore + studyScore + habitScore)));
  return finalScore;
}

export function calculateStreaks(userId: string): {
  currentStreak: number;
  longestStreak: number;
  isProductiveToday: boolean;
} {
  const db = getDb();

  // Find all distinct active dates (dates with completed task, logged habit, or completed focus session)
  const activeDatesRows = db
    .prepare(
      `
    SELECT date_str FROM (
      SELECT due_date as date_str FROM tasks WHERE user_id = ? AND status = 'completed'
      UNION
      SELECT date(completed_at) as date_str FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
      UNION
      SELECT logged_date as date_str FROM habit_logs WHERE user_id = ?
      UNION
      SELECT date(started_at) as date_str FROM pomodoro_sessions WHERE user_id = ? AND completed = 1
      UNION
      SELECT date(completed_at) as date_str FROM meditation_sessions WHERE user_id = ? AND completed = 1
    ) WHERE date_str IS NOT NULL ORDER BY date_str DESC
  `
    )
    .all(userId, userId, userId, userId, userId) as { date_str: string }[];

  const activeDates = Array.from(new Set(activeDatesRows.map((r) => r.date_str))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isProductiveToday: false };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const isProductiveToday = activeDates.includes(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();

  // If not productive today, check starting from yesterday
  if (!isProductiveToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (activeDates.includes(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak across all history
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  const sortedAsc = [...activeDates].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  for (const dStr of sortedAsc) {
    const currDate = new Date(dStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffMs = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currDate;
  }

  return { currentStreak, longestStreak, isProductiveToday };
}

export function getAnalyticsSummary(userId: string, daysCount: number = 30): AnalyticsSummary {
  const db = getDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const dailyScore = calculateDailyProductivityScore(userId, todayStr);
  const streakInfo = calculateStreaks(userId);

  // 1. Score trend for last 14 days
  const scoreTrend: { date: string; score: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const score = calculateDailyProductivityScore(userId, dStr);
    if (score !== null) {
      scoreTrend.push({ date: dStr, score });
    }
  }

  // 2. Task metrics
  const taskCounts = db
    .prepare(
      `
    SELECT status, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY status
  `
    )
    .all(userId) as { status: string; count: number }[];

  let created = 0;
  let completed = 0;
  let postponed = 0;

  for (const row of taskCounts) {
    created += row.count;
    if (row.status === 'completed') completed = row.count;
    if (row.status === 'postponed') postponed = row.count;
  }

  const completionPercentage = created > 0 ? Math.round((completed / created) * 100) : 0;

  // 3. Study metrics
  const studySessions = db
    .prepare(
      `
    SELECT duration_mins, started_at FROM pomodoro_sessions WHERE user_id = ? AND completed = 1
  `
    )
    .all(userId) as { duration_mins: number; started_at: string }[];

  const totalMinutes = studySessions.reduce((acc, s) => acc + s.duration_mins, 0);
  const totalSessions = studySessions.length;
  const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  // Group study time by date for last 14 days
  const dailyStudyMap = new Map<string, number>();
  for (const s of studySessions) {
    const dStr = s.started_at.split('T')[0] || s.started_at.split(' ')[0];
    dailyStudyMap.set(dStr, (dailyStudyMap.get(dStr) || 0) + s.duration_mins);
  }

  const dailyStudyTime: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    dailyStudyTime.push({ date: dStr, minutes: dailyStudyMap.get(dStr) || 0 });
  }

  // 4. Category performance
  const categories = db
    .prepare(`SELECT id, name, color FROM categories WHERE user_id = ?`)
    .all(userId) as Category[];

  const categoryPerformance = categories.map((cat) => {
    const taskCountRes = db
      .prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND category_id = ? AND status = 'completed'`)
      .get(userId, cat.id) as { count: number };

    const studyMinsRes = db
      .prepare(`SELECT SUM(duration_mins) as total FROM pomodoro_sessions WHERE user_id = ? AND category_id = ? AND completed = 1`)
      .get(userId, cat.id) as { total: number | null };

    return {
      category: cat.name,
      color: cat.color,
      count: taskCountRes?.count || 0,
      minutes: studyMinsRes?.total || 0,
    };
  }).filter((c) => c.count > 0 || c.minutes > 0);

  // 5. Habit consistency
  const userHabits = db.prepare(`SELECT id, name FROM habits WHERE user_id = ?`).all(userId) as Habit[];
  const habitConsistency = userHabits.map((habit) => {
    const logCountRes = db
      .prepare(`SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ? AND habit_id = ?`)
      .get(userId, habit.id) as { count: number };

    // Calculate completion % over last 30 days
    const totalPossible = 30;
    const percentage = Math.min(100, Math.round(((logCountRes?.count || 0) / totalPossible) * 100));

    return {
      habitId: habit.id,
      name: habit.name,
      percentage,
    };
  });

  // 6. Productivity Heatmap Data
  const heatmapData: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  const heatmapDays = daysCount;

  for (let i = heatmapDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];

    const tasksDone = db
      .prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND (due_date = ? OR date(completed_at) = ?) AND status = 'completed'`)
      .get(userId, dStr, dStr) as { cnt: number };

    const pomodoroDone = db
      .prepare(`SELECT COUNT(*) as cnt FROM pomodoro_sessions WHERE user_id = ? AND date(started_at) = ? AND completed = 1`)
      .get(userId, dStr) as { cnt: number };

    const habitsDone = db
      .prepare(`SELECT COUNT(*) as cnt FROM habit_logs WHERE user_id = ? AND logged_date = ?`)
      .get(userId, dStr) as { cnt: number };

    const medDone = db
      .prepare(`SELECT COUNT(*) as cnt FROM meditation_sessions WHERE user_id = ? AND date(completed_at) = ? AND completed = 1`)
      .get(userId, dStr) as { cnt: number };

    const actionCount = (tasksDone?.cnt || 0) + (pomodoroDone?.cnt || 0) + (habitsDone?.cnt || 0) + (medDone?.cnt || 0);

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (actionCount >= 7) level = 4;
    else if (actionCount >= 5) level = 3;
    else if (actionCount >= 3) level = 2;
    else if (actionCount >= 1) level = 1;

    heatmapData.push({ date: dStr, count: actionCount, level });
  }

  // 7. Generate Algorithmic Personal Insights
  const insights: string[] = [];
  const activeDaysCount = heatmapData.filter((h) => h.count > 0).length;

  if (activeDaysCount < 3) {
    insights.push("Keep using the app and I'll show patterns once there is enough activity.");
  } else {
    // Find best category
    if (categoryPerformance.length > 0) {
      const topCat = [...categoryPerformance].sort((a, b) => b.minutes - a.minutes)[0];
      if (topCat && topCat.minutes > 0) {
        insights.push(`You tend to study ${topCat.category} for longer sessions (${topCat.minutes} mins total).`);
      }
    }

    // Completion percentage insight
    if (created >= 5) {
      insights.push(`You have completed ${completionPercentage}% of your planned tasks.`);
    }

    // Streak insight
    if (streakInfo.currentStreak >= 3) {
      insights.push(`You are on a ${streakInfo.currentStreak}-day streak! Your consistency is building momentum.`);
    }

    // Most productive day
    const bestDayObj = [...heatmapData].sort((a, b) => b.count - a.count)[0];
    if (bestDayObj && bestDayObj.count > 0) {
      const dateFormatted = new Date(bestDayObj.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      insights.push(`Your most productive day recently was ${dateFormatted} with ${bestDayObj.count} activities.`);
    }
  }

  return {
    dailyScore,
    scoreTrend,
    taskMetrics: { created, completed, postponed, completionPercentage },
    studyMetrics: { totalMinutes, totalSessions, avgSessionLength, dailyStudyTime },
    categoryPerformance,
    streakInfo,
    habitConsistency,
    heatmapData,
    insights,
  };
}
