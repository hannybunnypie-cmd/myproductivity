import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { WeeklyReview } from '@/lib/types';
import { calculateStreaks } from '@/lib/stats';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let weekStart = searchParams.get('week_start');

  if (!weekStart) {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(d.setDate(diff));
    weekStart = monday.toISOString().split('T')[0];
  }

  const db = getDb();

  // Compute 7 days range
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const weekEndStr = endDate.toISOString().split('T')[0];

  // Tasks completed this week
  const completedTasksRes = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'completed' AND date(completed_at) >= ? AND date(completed_at) <= ?`
    )
    .get(user.id, weekStart, weekEndStr) as { count: number };

  const postponedTasksRes = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'postponed' AND due_date >= ? AND due_date <= ?`)
    .get(user.id, weekStart, weekEndStr) as { count: number };

  // Study hours & Pomodoro sessions
  const pomoRes = db
    .prepare(
      `SELECT COUNT(*) as sessions, SUM(duration_mins) as mins FROM pomodoro_sessions WHERE user_id = ? AND completed = 1 AND date(started_at) >= ? AND date(started_at) <= ?`
    )
    .get(user.id, weekStart, weekEndStr) as { sessions: number; mins: number | null };

  const studyMinutes = pomoRes?.mins || 0;
  const pomodoroSessions = pomoRes?.sessions || 0;

  // Habits completed
  const habitsRes = db
    .prepare(
      `SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ? AND logged_date >= ? AND logged_date <= ?`
    )
    .get(user.id, weekStart, weekEndStr) as { count: number };

  const streakInfo = calculateStreaks(user.id);

  // Existing review text
  const review = db
    .prepare('SELECT * FROM weekly_reviews WHERE user_id = ? AND week_start_date = ?')
    .get(user.id, weekStart) as WeeklyReview | undefined;

  return NextResponse.json({
    weekStart,
    weekEnd: weekEndStr,
    metrics: {
      tasksCompleted: completedTasksRes?.count || 0,
      postponedTasks: postponedTasksRes?.count || 0,
      studyHours: (studyMinutes / 60).toFixed(1),
      pomodoroSessions,
      habitsCompleted: habitsRes?.count || 0,
      currentStreak: streakInfo.currentStreak,
    },
    review: review || null,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { week_start_date, what_went_well, what_could_improve, focus_next_week } = await req.json();

    if (!week_start_date) {
      return NextResponse.json({ error: 'Week start date is required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM weekly_reviews WHERE user_id = ? AND week_start_date = ?')
      .get(user.id, week_start_date) as { id: string } | undefined;

    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE weekly_reviews SET
          what_went_well = ?,
          what_could_improve = ?,
          focus_next_week = ?
        WHERE id = ?
      `).run(what_went_well || '', what_could_improve || '', focus_next_week || '', existing.id);
    } else {
      const reviewId = 'wr_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      db.prepare(`
        INSERT INTO weekly_reviews (id, user_id, week_start_date, what_went_well, what_could_improve, focus_next_week, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(reviewId, user.id, week_start_date, what_went_well || '', what_could_improve || '', focus_next_week || '', now);
    }

    const updated = db
      .prepare('SELECT * FROM weekly_reviews WHERE user_id = ? AND week_start_date = ?')
      .get(user.id, week_start_date) as WeeklyReview;

    return NextResponse.json({ success: true, review: updated });
  } catch (err: any) {
    console.error('Save weekly review error:', err);
    return NextResponse.json({ error: 'Failed to save weekly review' }, { status: 500 });
  }
}
