import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Goal } from '@/lib/types';
import { awardXP } from '@/lib/gamification';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY deadline ASC').all(user.id) as Goal[];
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, deadline, target_amount, unit, category_id } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });
    }

    const goalId = 'g_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const db = getDb();

    db.prepare(`
      INSERT INTO goals (id, user_id, category_id, title, deadline, target_amount, current_amount, unit, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      goalId,
      user.id,
      category_id || null,
      title.trim(),
      deadline || new Date().toISOString().split('T')[0],
      target_amount || 10,
      unit || 'tasks',
      createdAt
    );

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as Goal;
    return NextResponse.json({ success: true, goal });
  } catch (err: any) {
    console.error('Create goal error:', err);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, title, current_amount, target_amount, deadline } = await req.json();
    if (!id) return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, user.id) as Goal | undefined;
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const newCurrent = current_amount !== undefined ? Number(current_amount) : existing.current_amount;
    const newTarget = target_amount !== undefined ? Number(target_amount) : existing.target_amount;

    let xpAwarded = null;
    // If reached target for first time -> award +100 XP
    if (newCurrent >= newTarget && existing.current_amount < existing.target_amount) {
      xpAwarded = awardXP(user.id, 100);
    }

    db.prepare(`
      UPDATE goals SET
        title = COALESCE(?, title),
        current_amount = COALESCE(?, current_amount),
        target_amount = COALESCE(?, target_amount),
        deadline = COALESCE(?, deadline)
      WHERE id = ? AND user_id = ?
    `).run(
      title ? title.trim() : null,
      newCurrent,
      newTarget,
      deadline ?? null,
      id,
      user.id
    );

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
    return NextResponse.json({ success: true, goal: updated, xpAwarded });
  } catch (err: any) {
    console.error('Update goal error:', err);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}
