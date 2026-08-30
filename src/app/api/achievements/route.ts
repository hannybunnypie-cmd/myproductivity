import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserAchievementsWithStatus, getUserXP, calculateXPForNextLevel } from '@/lib/gamification';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const achievements = getUserAchievementsWithStatus(user.id);
  const userXP = getUserXP(user.id);
  const levelThresholds = calculateXPForNextLevel(userXP.level);

  return NextResponse.json({
    userXP,
    levelThresholds,
    achievements,
  });
}
