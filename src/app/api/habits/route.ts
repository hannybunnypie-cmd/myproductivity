import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Habit } from '@/lib/types';
import { awardXP } from '@/lib/gamification';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const todayStr = new Date().toISOString().split('T')[0];

  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC').all(user.id) as Habit[];

  const habitsWithStats = habits.map((h) => {
    const todayLog = db
      .prepare('SELECT id FROM habit_logs WHERE user_id = ? AND habit_id = ? AND logged_date = ?')
      .get(user.id, h.id, todayStr);

    const totalLogsRes = db
      .prepare('SELECT COUNT(*) as count FROM habit_logs WHERE user_id = ? AND habit_id = ?')
      .get(user.id, h.id) as { count: number };

    // Compute streak for habit
    const logs = db
      .prepare('SELECT logged_date FROM habit_logs WHERE user_id = ? AND habit_id = ? ORDER BY logged_date DESC')
      .all(user.id, h.id) as { logged_date: string }[];

    let streak = 0;
    const logDates = logs.map((l) => l.logged_date);
    let checkDate = new Date();

    if (!logDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (logDates.includes(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      ...h,
      completed_today: Boolean(todayLog),
      current_streak: streak,
      total_logs: totalLogsRes?.count || 0,
    };
  });

  return NextResponse.json({ habits: habitsWithStats });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, frequency, target_days_per_week, reminder_time } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    }

    const habitId = 'h_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const now = new Date().toISOString();
    const startDate = now.split('T')[0];
    const db = getDb();

    db.prepare(`
      INSERT INTO habits (id, user_id, name, frequency, target_days_per_week, reminder_time, start_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      habitId,
      user.id,
      name.trim(),
      frequency || 'daily',
      target_days_per_week || 7,
      reminder_time || null,
      startDate,
      now
    );

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId) as Habit;
    return NextResponse.json({
      success: true,
      habit: { ...habit, completed_today: false, current_streak: 0, total_logs: 0 },
    });
  } catch (err: any) {
    console.error('Create habit error:', err);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { habit_id, logged_date, notes } = await req.json();
    if (!habit_id) return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });

    const targetDate = logged_date || new Date().toISOString().split('T')[0];
    const db = getDb();

    const existingLog = db
      .prepare('SELECT id FROM habit_logs WHERE user_id = ? AND habit_id = ? AND logged_date = ?')
      .get(user.id, habit_id, targetDate) as { id: string } | undefined;

    let xpAwarded = null;
    let completed = false;

    if (existingLog) {
      // Toggle off log
      db.prepare('DELETE FROM habit_logs WHERE id = ?').run(existingLog.id);
      completed = false;
    } else {
      // Log habit completion
      const logId = 'hl_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      const now = new Date().toISOString();
      db.prepare('INSERT INTO habit_logs (id, user_id, habit_id, logged_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        logId,
        user.id,
        habit_id,
        targetDate,
        notes || null,
        now
      );
      completed = true;
      xpAwarded = awardXP(user.id, 15); // +15 XP for logging habit
    }

    return NextResponse.json({ success: true, completed, xpAwarded });
  } catch (err: any) {
    console.error('Toggle habit log error:', err);
    return NextResponse.json({ error: 'Failed to toggle habit' }, { status: 500 });
  }
}
