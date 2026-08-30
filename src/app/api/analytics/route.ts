import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAnalyticsSummary } from '@/lib/stats';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get('timeframe') || '30';
  const days = parseInt(timeframe, 10) || 30;

  const summary = getAnalyticsSummary(user.id, days);
  return NextResponse.json({ summary });
}
