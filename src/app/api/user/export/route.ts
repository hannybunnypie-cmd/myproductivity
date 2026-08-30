import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const userId = user.id;

  const data = {
    user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
    preferences: db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId),
    categories: db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId),
    goals: db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId),
    tasks: db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId),
    subtasks: db.prepare('SELECT * FROM subtasks WHERE user_id = ?').all(userId),
    habits: db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId),
    habit_logs: db.prepare('SELECT * FROM habit_logs WHERE user_id = ?').all(userId),
    pomodoro_sessions: db.prepare('SELECT * FROM pomodoro_sessions WHERE user_id = ?').all(userId),
    meditation_sessions: db.prepare('SELECT * FROM meditation_sessions WHERE user_id = ?').all(userId),
    journal_entries: db.prepare('SELECT * FROM journal_entries WHERE user_id = ?').all(userId),
    weekly_reviews: db.prepare('SELECT * FROM weekly_reviews WHERE user_id = ?').all(userId),
    user_xp: db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(userId),
    achievements: db.prepare('SELECT * FROM user_achievements WHERE user_id = ?').all(userId),
    exported_at: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="productivity_export_${user.name}_${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
