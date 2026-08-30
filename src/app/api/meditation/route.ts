import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { awardXP } from '@/lib/gamification';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { type, duration_mins, completed } = await req.json();

    if (!duration_mins || duration_mins <= 0) {
      return NextResponse.json({ error: 'Valid duration is required' }, { status: 400 });
    }

    const isCompleted = Boolean(completed);
    if (!isCompleted) {
      // Prompt specifically says: "Do not count partially completed sessions as completed."
      return NextResponse.json({ error: 'Only completed sessions count toward progress.' }, { status: 400 });
    }

    const db = getDb();
    const sessionId = 'med_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO meditation_sessions (id, user_id, type, duration_mins, completed, completed_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(sessionId, user.id, type || 'meditation', duration_mins, now);

    // Award +15 XP for meditation/breathing completion
    const xpAwarded = awardXP(user.id, 15);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      xpAwarded,
    });
  } catch (err: any) {
    console.error('Record meditation session error:', err);
    return NextResponse.json({ error: 'Failed to record session' }, { status: 500 });
  }
}
