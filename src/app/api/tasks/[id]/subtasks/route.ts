import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { awardXP } from '@/lib/gamification';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const { title } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
    }

    const db = getDb();
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, user.id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const subtaskId = 'st_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const createdAt = new Date().toISOString();

    db.prepare('INSERT INTO subtasks (id, task_id, user_id, title, completed, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
      subtaskId,
      taskId,
      user.id,
      title.trim(),
      createdAt
    );

    const created = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId) as any;
    return NextResponse.json({ success: true, subtask: { ...created, completed: Boolean(created.completed) } });
  } catch (err: any) {
    console.error('Add subtask error:', err);
    return NextResponse.json({ error: 'Failed to add subtask' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const { subtaskId, completed } = await req.json();
    if (!subtaskId) return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });

    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ? AND user_id = ?')
      .get(subtaskId, taskId, user.id) as any;

    if (!existing) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

    const isCompleted = Boolean(completed);
    const completedAt = isCompleted ? new Date().toISOString() : null;

    let xpAwarded = null;
    if (isCompleted && !existing.completed) {
      xpAwarded = awardXP(user.id, 5); // +5 XP for subtask completion
    }

    db.prepare('UPDATE subtasks SET completed = ?, completed_at = ? WHERE id = ?').run(
      isCompleted ? 1 : 0,
      completedAt,
      subtaskId
    );

    // Auto-update parent task status if all subtasks completed
    const allSubtasks = (db.prepare('SELECT completed FROM subtasks WHERE task_id = ?').all(taskId) as any[]) || [];
    const totalSubtasks = allSubtasks.length;
    const completedSubtasks = allSubtasks.filter((s: any) => Boolean(s.completed)).length;

    let parentTaskUpdated = false;
    if (totalSubtasks > 0 && completedSubtasks === totalSubtasks) {
      const parentTask = db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId) as any;
      if (parentTask && parentTask.status !== 'completed') {
        db.prepare("UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          taskId
        );
        awardXP(user.id, 20); // Award +20 XP for auto-completing parent task
        parentTaskUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      subtask: { ...existing, completed: isCompleted, completed_at: completedAt },
      xpAwarded,
      parentTaskUpdated,
    });
  } catch (err: any) {
    console.error('Toggle subtask error:', err);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}
