import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { task_title, category } = await req.json();
    if (!task_title || !task_title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

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
                content:
                  'You are a study breakdown assistant. Given a high-level task or goal, output a JSON array of 4-6 concise, practical subtasks. Respond ONLY with valid JSON array of strings e.g. ["Subtask 1", "Subtask 2"].',
              },
              {
                role: 'user',
                content: `Break down this task/goal into actionable subtasks: "${task_title}"${category ? ` (Category: ${category})` : ''}`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content?.trim();
          if (content) {
            const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''));
            if (Array.isArray(parsed)) {
              return NextResponse.json({ suggestions: parsed });
            }
          }
        }
      } catch (aiErr) {
        console.warn('AI API call failed, falling back to rule engine:', aiErr);
      }
    }

    // Fallback rule-based generator for instant responsiveness
    const titleLower = task_title.toLowerCase();
    let suggestions: string[] = [];

    if (titleLower.includes('dsa') || titleLower.includes('array') || titleLower.includes('algorithm') || titleLower.includes('code') || titleLower.includes('leetcode')) {
      suggestions = [
        'Understand core concepts & time complexity',
        'Solve Two Sum and Prefix Sum patterns',
        'Practice 3 Medium level problems',
        'Implement Sliding Window approach',
        'Review edge cases and test boundary inputs',
      ];
    } else if (titleLower.includes('network') || titleLower.includes('tcp') || titleLower.includes('osi') || titleLower.includes('ip')) {
      suggestions = [
        'Understand OSI 7-layer model & TCP/IP stack',
        'Study IP addressing & subnetting calculations',
        'Learn TCP 3-way handshake & congestion control',
        'Review DNS, HTTP/HTTPS and common protocols',
        'Solve 10 practice questions',
      ];
    } else if (titleLower.includes('sql') || titleLower.includes('database') || titleLower.includes('query')) {
      suggestions = [
        'Review SELECT, WHERE, and GROUP BY syntax',
        'Practice INNER and LEFT JOIN queries',
        'Solve 5 practice problems on Window Functions',
        'Optimize index usage and query execution plan',
      ];
    } else if (titleLower.includes('exam') || titleLower.includes('study') || titleLower.includes('chapter')) {
      suggestions = [
        'Read key textbook concepts & summarize notes',
        'Create 10 flashcards for high-yield formulas',
        'Complete chapter review exercises',
        'Take a 20-minute timed quiz',
      ];
    } else {
      suggestions = [
        `Understand core concepts of ${task_title}`,
        `Gather key references and study materials`,
        `Practice first 3 foundational examples`,
        `Complete main exercise / assignment`,
        `Review and summarize key takeaways`,
      ];
    }

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error('Breakdown API error:', err);
    return NextResponse.json({ error: 'Failed to generate task breakdown' }, { status: 500 });
  }
}
