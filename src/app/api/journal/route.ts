import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { JournalEntry } from '@/lib/types';
import { awardXP } from '@/lib/gamification';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const db = getDb();
  const entry = db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ?')
    .get(user.id, dateStr) as JournalEntry | undefined;

  const history = db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 30')
    .all(user.id) as JournalEntry[];

  return NextResponse.json({ entry: entry || null, history });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { entry_date, accomplishments, distractions, learnings, improvements } = await req.json();
    const dateStr = entry_date || new Date().toISOString().split('T')[0];
    const db = getDb();

    const existing = db
      .prepare('SELECT id FROM journal_entries WHERE user_id = ? AND entry_date = ?')
      .get(user.id, dateStr) as { id: string } | undefined;

    const now = new Date().toISOString();
    let xpAwarded = null;

    if (existing) {
      db.prepare(`
        UPDATE journal_entries SET
          accomplishments = ?,
          distractions = ?,
          learnings = ?,
          improvements = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        accomplishments || '',
        distractions || '',
        learnings || '',
        improvements || '',
        now,
        existing.id
      );
    } else {
      const entryId = 'j_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
      db.prepare(`
        INSERT INTO journal_entries (id, user_id, entry_date, accomplishments, distractions, learnings, improvements, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entryId,
        user.id,
        dateStr,
        accomplishments || '',
        distractions || '',
        learnings || '',
        improvements || '',
        now,
        now
      );

      // Award +15 XP for creating journal entry
      xpAwarded = awardXP(user.id, 15);
    }

    const updated = db
      .prepare('SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ?')
      .get(user.id, dateStr) as JournalEntry;

    return NextResponse.json({ success: true, entry: updated, xpAwarded });
  } catch (err: any) {
    console.error('Save journal entry error:', err);
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
  }
}
