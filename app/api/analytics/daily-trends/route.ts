import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const daysParam = request.nextUrl.searchParams.get('days')
    const limitParam = request.nextUrl.searchParams.get('limit')
    const days = daysParam ? parseInt(daysParam) : 30
    const limit = limitParam ? parseInt(limitParam) : 50

    const supabase = await createClient()

    // Get all student profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get daily activity for each student
    const studentsData = await Promise.all(
      profiles.map(async (profile) => {
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('attempted_at, status')
          .eq('student_id', profile.id)
          .gte('attempted_at', startDate.toISOString())

        // Group by date
        const byDate = new Map<string, { attempts: number; correct: number }>()

        for (const row of progressData || []) {
          const date = row?.attempted_at?.split('T')[0] || ''
          if (!byDate.has(date)) {
            byDate.set(date, { attempts: 0, correct: 0 })
          }
          const dayData = byDate.get(date)!
          dayData.attempts += 1
          if (row.status === 'correct') dayData.correct += 1
        }

        return {
          studentId: profile.id,
          studentName: profile.full_name,
          dailyActivity: Array.from(byDate.entries()).map(([date, data]) => ({
            date,
            attempts: data.attempts,
            correct: data.correct,
            accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
          })),
        }
      })
    )

    return NextResponse.json(studentsData)
  } catch (error: any) {
    console.error('Daily trends error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
