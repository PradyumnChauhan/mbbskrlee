import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all students' accuracy
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')

    const allAccuracies = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('status')
          .eq('student_id', profile.id)

        const totalAttempts = progressData?.length || 0
        const correctCount = progressData?.filter(p => p.status === 'correct').length || 0
        const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

        return { id: profile.id, accuracy }
      })
    )

    // Get current student's accuracy
    const currentStudent = allAccuracies.find(a => a.id === studentId)
    const currentAccuracy = currentStudent?.accuracy || 0

    // Calculate percentile
    const betterCount = allAccuracies.filter(a => a.accuracy > currentAccuracy).length
    const percentile = Math.round(((allAccuracies.length - betterCount) / allAccuracies.length) * 100)

    // Calculate class average (excluding current student)
    const otherAccuracies = allAccuracies.filter(a => a.id !== studentId).map(a => a.accuracy)
    const classAverage = otherAccuracies.length > 0 
      ? Math.round(otherAccuracies.reduce((a, b) => a + b, 0) / otherAccuracies.length)
      : 0

    // Get top 10% and bottom 10%
    const sorted = [...allAccuracies].sort((a, b) => b.accuracy - a.accuracy)
    const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1))
    const bottom10Count = Math.max(1, Math.ceil(sorted.length * 0.1))

    const top10Avg = Math.round(sorted.slice(0, top10Count).reduce((sum, s) => sum + s.accuracy, 0) / top10Count)
    const bottom10Avg = Math.round(sorted.slice(-bottom10Count).reduce((sum, s) => sum + s.accuracy, 0) / bottom10Count)

    return NextResponse.json({
      currentAccuracy,
      percentile,
      classAverage,
      vsClassAverage: currentAccuracy - classAverage,
      top10Avg,
      vsTop10: currentAccuracy - top10Avg,
      bottom10Avg,
      vsBottom10: currentAccuracy - bottom10Avg,
    })
  } catch (error: any) {
    console.error('Comparison metrics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
