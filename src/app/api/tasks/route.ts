import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Task, Subtask } from '@/lib/types';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category_id');

  const db = getDb();
  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [user.id];

  if (dateStr) {
    query += ` AND (t.due_date = ? OR t.is_focus_today = 1 OR t.status != 'completed')`;
    params.push(dateStr);
  }

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND t.status = ?`;
    params.push(statusFilter);
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query += ` AND t.category_id = ?`;
    params.push(categoryFilter);
  }

  query += ` ORDER BY t.due_date ASC, t.created_at DESC`;

  const rows = db.prepare(query).all(...params) as any[];

  // Attach subtasks & parse json fields
  const tasks: Task[] = rows.map((r) => {
    const subtasks = db
      .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC')
      .all(r.id) as Subtask[];

    return {
      ...r,
      is_focus_today: Boolean(r.is_focus_today),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []),
      subtasks: subtasks.map((s) => ({ ...s, completed: Boolean(s.completed) })),
    };
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      title,
      description,
      category_id,
      goal_id,
      priority,
      due_date,
      estimated_duration_mins,
      recurring_rule,
      tags,
      notes,
      subtasks,
      is_focus_today,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const taskId = 't_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const db = getDb();

    db.prepare(`
      INSERT INTO tasks (
        id, user_id, goal_id, category_id, title, description, priority, due_date,
        estimated_duration_mins, actual_duration_mins, status, is_focus_today,
        recurring_rule, tags, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'not_started', ?, ?, ?, ?, ?)
    `).run(
      taskId,
      user.id,
      goal_id || null,
      category_id || null,
      title.trim(),
      description || '',
      priority || 'medium',
      due_date || new Date().toISOString().split('T')[0],
      estimated_duration_mins || 30,
      is_focus_today ? 1 : 0,
      recurring_rule || 'none',
      JSON.stringify(tags || []),
      notes || '',
      createdAt
    );

    // Insert subtasks if provided
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      const subStmt = db.prepare(
        'INSERT INTO subtasks (id, task_id, user_id, title, completed, created_at) VALUES (?, ?, ?, ?, 0, ?)'
      );
      for (const st of subtasks) {
        if (typeof st === 'string' && st.trim()) {
          const sId = 'st_' + Math.random().toString(36).substring(2, 8);
          subStmt.run(sId, taskId, user.id, st.trim(), createdAt);
        } else if (st && typeof st.title === 'string' && st.title.trim()) {
          const sId = 'st_' + Math.random().toString(36).substring(2, 8);
          subStmt.run(sId, taskId, user.id, st.title.trim(), createdAt);
        }
      }
    }

    const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
    const insertedSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId) as any[];

    return NextResponse.json({
      success: true,
      task: {
        ...createdTask,
        is_focus_today: Boolean(createdTask.is_focus_today),
        tags: typeof createdTask.tags === 'string' ? JSON.parse(createdTask.tags || '[]') : (createdTask.tags || []),
        subtasks: insertedSubtasks.map((s) => ({ ...s, completed: Boolean(s.completed) })),
      },
    });
  } catch (err: any) {
    console.error('Create task error:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
