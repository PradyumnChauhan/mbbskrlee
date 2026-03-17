import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get('student_id')
    const daysParam = request.nextUrl.searchParams.get('days')
    const days = daysParam ? parseInt(daysParam) : 90

    if (!studentId) {
      return NextResponse.json({ error: 'student_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('student_progress')
      .select('attempted_at, status')
      .eq('student_id', studentId)
      .gte('attempted_at', startDate.toISOString())
      .order('attempted_at', { ascending: true })

    if (error) throw error

    // Group by date
    const byDate = new Map<string, { attempts: number; correct: number }>()

    for (const row of data || []) {
      const date = row?.attempted_at?.split('T')[0] || ''
      if (!byDate.has(date)) {
        byDate.set(date, { attempts: 0, correct: 0 })
      }
      const dayData = byDate.get(date)!
      dayData.attempts += 1
      if (row.status === 'correct') dayData.correct += 1
    }

    const result = Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      correct: data.correct,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Daily activity error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
