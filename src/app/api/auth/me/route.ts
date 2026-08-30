import { NextResponse } from 'next/server';
import { getCurrentUser, getUserPreferences } from '@/lib/auth';
import { getUserXP } from '@/lib/gamification';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const preferences = await getUserPreferences(user.id);
  const xp = getUserXP(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
    preferences,
    xp,
  });
}
