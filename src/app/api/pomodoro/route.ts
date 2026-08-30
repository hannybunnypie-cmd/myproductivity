import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { awardXP } from '@/lib/gamification';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { task_id, category_id, duration_mins, completed, started_at, ended_at } = await req.json();

    if (!duration_mins || duration_mins <= 0) {
      return NextResponse.json({ error: 'Valid session duration is required' }, { status: 400 });
    }

    const isCompleted = Boolean(completed);
    const db = getDb();
    const sessionId = 'pomo_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const startStr = started_at || new Date(Date.now() - duration_mins * 60000).toISOString();
    const endStr = ended_at || new Date().toISOString();

    db.prepare(`
      INSERT INTO pomodoro_sessions (id, user_id, task_id, category_id, duration_mins, completed, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      user.id,
      task_id || null,
      category_id || null,
      duration_mins,
      isCompleted ? 1 : 0,
      startStr,
      endStr
    );

    let xpAwarded = null;

    if (isCompleted) {
      // Award +25 XP for completing Pomodoro session
      xpAwarded = awardXP(user.id, 25);

      // If associated with a task, increment task actual duration
      if (task_id) {
        db.prepare('UPDATE tasks SET actual_duration_mins = actual_duration_mins + ? WHERE id = ? AND user_id = ?').run(
          duration_mins,
          task_id,
          user.id
        );
      }
    }

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      xpAwarded,
    });
  } catch (err: any) {
    console.error('Record Pomodoro error:', err);
    return NextResponse.json({ error: 'Failed to record Pomodoro session' }, { status: 500 });
  }
}
