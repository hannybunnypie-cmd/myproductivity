import { NextResponse } from 'next/server';
import { getCurrentUser, getUserPreferences } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preferences = await getUserPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();

    // Ensure record exists
    await getUserPreferences(user.id);

    const {
      onboarded,
      focus_areas,
      study_areas,
      daily_study_target_mins,
      preferred_study_time,
      track_meditation,
      use_pomodoro,
      pomodoro_work_mins,
      pomodoro_short_break_mins,
      pomodoro_long_break_mins,
      timezone,
      theme,
      name,
    } = body;

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), user.id);
    }

    db.prepare(`
      UPDATE user_preferences SET
        onboarded = COALESCE(?, onboarded),
        focus_areas = COALESCE(?, focus_areas),
        study_areas = COALESCE(?, study_areas),
        daily_study_target_mins = COALESCE(?, daily_study_target_mins),
        preferred_study_time = COALESCE(?, preferred_study_time),
        track_meditation = COALESCE(?, track_meditation),
        use_pomodoro = COALESCE(?, use_pomodoro),
        pomodoro_work_mins = COALESCE(?, pomodoro_work_mins),
        pomodoro_short_break_mins = COALESCE(?, pomodoro_short_break_mins),
        pomodoro_long_break_mins = COALESCE(?, pomodoro_long_break_mins),
        timezone = COALESCE(?, timezone),
        theme = COALESCE(?, theme)
      WHERE user_id = ?
    `).run(
      onboarded !== undefined ? (onboarded ? 1 : 0) : null,
      focus_areas ? JSON.stringify(focus_areas) : null,
      study_areas ? JSON.stringify(study_areas) : null,
      daily_study_target_mins ?? null,
      preferred_study_time ?? null,
      track_meditation !== undefined ? (track_meditation ? 1 : 0) : null,
      use_pomodoro !== undefined ? (use_pomodoro ? 1 : 0) : null,
      pomodoro_work_mins ?? null,
      pomodoro_short_break_mins ?? null,
      pomodoro_long_break_mins ?? null,
      timezone ?? null,
      theme ?? null,
      user.id
    );

    const updated = await getUserPreferences(user.id);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (err: any) {
    console.error('Update preferences error:', err);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
