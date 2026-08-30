import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { awardXP } from '@/lib/gamification';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const {
      title,
      description,
      priority,
      status,
      due_date,
      estimated_duration_mins,
      actual_duration_mins,
      category_id,
      goal_id,
      is_focus_today,
      recurring_rule,
      tags,
      notes,
    } = body;

    let completedAt = existing.completed_at;
    let xpAwarded = null;

    // Handle transition to completed
    if (status === 'completed' && existing.status !== 'completed') {
      completedAt = new Date().toISOString();
      xpAwarded = awardXP(user.id, 20); // Award +20 XP for task completion

      // If linked to goal, increment goal progress
      if (existing.goal_id) {
        db.prepare('UPDATE goals SET current_amount = current_amount + 1 WHERE id = ? AND user_id = ?').run(
          existing.goal_id,
          user.id
        );
      }
    } else if (status && status !== 'completed' && existing.status === 'completed') {
      completedAt = null;
      if (existing.goal_id) {
        db.prepare('UPDATE goals SET current_amount = MAX(0, current_amount - 1) WHERE id = ? AND user_id = ?').run(
          existing.goal_id,
          user.id
        );
      }
    }

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        due_date = COALESCE(?, due_date),
        estimated_duration_mins = COALESCE(?, estimated_duration_mins),
        actual_duration_mins = COALESCE(?, actual_duration_mins),
        category_id = COALESCE(?, category_id),
        goal_id = COALESCE(?, goal_id),
        is_focus_today = COALESCE(?, is_focus_today),
        recurring_rule = COALESCE(?, recurring_rule),
        tags = COALESCE(?, tags),
        notes = COALESCE(?, notes),
        completed_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title ? title.trim() : null,
      description !== undefined ? description : null,
      priority ?? null,
      status ?? null,
      due_date ?? null,
      estimated_duration_mins ?? null,
      actual_duration_mins ?? null,
      category_id ?? null,
      goal_id ?? null,
      is_focus_today !== undefined ? (is_focus_today ? 1 : 0) : null,
      recurring_rule ?? null,
      tags ? JSON.stringify(tags) : null,
      notes !== undefined ? notes : null,
      completedAt,
      id,
      user.id
    );

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(id) as any[];

    return NextResponse.json({
      success: true,
      task: {
        ...updatedTask,
        is_focus_today: Boolean(updatedTask.is_focus_today),
        tags: JSON.parse(updatedTask.tags || '[]'),
        subtasks: subtasks.map((s) => ({ ...s, completed: Boolean(s.completed) })),
      },
      xpAwarded,
    });
  } catch (err: any) {
    console.error('Update task error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete task error:', err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
