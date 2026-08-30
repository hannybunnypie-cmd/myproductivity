import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Category } from '@/lib/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC').all(user.id) as Category[];
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, color } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const catId = 'cat_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const db = getDb();

    db.prepare('INSERT INTO categories (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)').run(
      catId,
      user.id,
      name.trim(),
      color || '#3b82f6',
      createdAt
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId) as Category;
    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
