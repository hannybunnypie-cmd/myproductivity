import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const userId = 'u_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
      userId,
      email.toLowerCase().trim(),
      name.trim(),
      passwordHash,
      createdAt
    );

    // Initialize user preferences
    db.prepare(`
      INSERT INTO user_preferences (user_id, onboarded, focus_areas, study_areas, daily_study_target_mins, preferred_study_time, track_meditation, use_pomodoro, pomodoro_work_mins, pomodoro_short_break_mins, pomodoro_long_break_mins, timezone, theme)
      VALUES (?, 0, '[]', '[]', 120, 'morning', 1, 1, 25, 5, 15, 'UTC', 'dark')
    `).run(userId);

    // Initialize default categories for the user
    const defaultCategories = [
      { name: 'Study / Academics', color: '#3b82f6' },
      { name: 'Coding & Projects', color: '#10b981' },
      { name: 'Personal Development', color: '#8b5cf6' },
      { name: 'Health & Wellness', color: '#f59e0b' },
    ];
    const catInsert = db.prepare('INSERT INTO categories (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const cat of defaultCategories) {
      catInsert.run('cat_' + Math.random().toString(36).substring(2, 8), userId, cat.name, cat.color, createdAt);
    }

    // Initialize XP record
    db.prepare('INSERT INTO user_xp (user_id, total_xp, level) VALUES (?, 0, 1)').run(userId);

    const token = signToken({ userId, email: email.toLowerCase().trim() });

    const res = NextResponse.json({
      success: true,
      user: { id: userId, email: email.toLowerCase().trim(), name: name.trim() },
    });

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
}
