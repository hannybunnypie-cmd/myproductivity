import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAnalyticsSummary } from '@/lib/stats';
import { getUserXP } from '@/lib/gamification';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const analytics = getAnalyticsSummary(user.id, 14);
    const xpInfo = getUserXP(user.id);

    const userContext = `
User Profile: ${user.name}
Level: ${xpInfo.level} (Total XP: ${xpInfo.total_xp})
Current Streak: ${analytics.streakInfo.currentStreak} days (Longest: ${analytics.streakInfo.longestStreak} days)
Today's Score: ${analytics.dailyScore !== null ? analytics.dailyScore + '/100' : 'Not enough data yet'}
Tasks Completed: ${analytics.taskMetrics.completed} / ${analytics.taskMetrics.created} (${analytics.taskMetrics.completionPercentage}%)
Total Study Time: ${analytics.studyMetrics.totalMinutes} minutes across ${analytics.studyMetrics.totalSessions} Pomodoro sessions
Active Categories: ${analytics.categoryPerformance.map((c) => c.category).join(', ') || 'None created yet'}
    `.trim();

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an encouraging, calm personal productivity and study coach. Answer the user concise and directly. Use their real productivity context provided below to give realistic, tailored study advice. Never fabricate statistics. If context says "Not enough data yet", acknowledge it gently.

User Productivity Context:
${userContext}`,
              },
              { role: 'user', content: message },
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices[0]?.message?.content?.trim();
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (aiErr) {
        console.warn('AI API call error, falling back:', aiErr);
      }
    }

    // Context-aware coaching fallback engine
    const msgLower = message.toLowerCase();
    let reply = '';

    if (msgLower.includes('focus') || msgLower.includes('what should i focus') || msgLower.includes('today')) {
      if (analytics.taskMetrics.created === 0) {
        reply = `Hi ${user.name}! Since you don't have tasks scheduled yet, I recommend picking 1 core study goal today (e.g. 25 mins of DSA or reading) and adding your first task!`;
      } else {
        reply = `Based on your schedule, start with your highest priority task today. Try completing 1 Pomodoro (25 mins) session first to build early momentum!`;
      }
    } else if (msgLower.includes('behind') || msgLower.includes('fall') || msgLower.includes('slump')) {
      reply = `Falling behind is completely normal. Don't worry about yesterday. Pick just 1 small task for 15 minutes right now. Progress beats perfection!`;
    } else if (msgLower.includes('plan') || msgLower.includes('tomorrow') || msgLower.includes('schedule')) {
      reply = `For tomorrow, schedule 2 high-priority core tasks in the morning and 1 review habit in the evening. Keep total estimated time under 3 hours to stay consistent.`;
    } else if (msgLower.includes('summarize') || msgLower.includes('progress') || msgLower.includes('week')) {
      reply = `Here is your status: You are at Level ${xpInfo.level} with a ${analytics.streakInfo.currentStreak}-day streak. You've completed ${analytics.taskMetrics.completed} tasks and ${analytics.studyMetrics.totalMinutes} study minutes. Keep showing up!`;
    } else {
      reply = `I am here to help you stay consistent! You currently have a ${analytics.streakInfo.currentStreak}-day streak and ${analytics.studyMetrics.totalMinutes} total study minutes logged. Focus on one small win at a time today.`;
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('AI assistant API error:', err);
    return NextResponse.json({ error: 'Failed to process AI assistant query' }, { status: 500 });
  }
}
