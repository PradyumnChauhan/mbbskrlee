'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { BarChart3, TrendingUp, Zap, BookmarkIcon } from 'lucide-react'

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    totalAttempted: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    skippedAnswers: 0,
    accuracy: 0,
    totalBookmarks: 0,
  })
  const [subjectStats, setSubjectStats] = useState<any[]>([])
  const [contributions, setContributions] = useState<Record<string, number>>({})
  const [yearRange, setYearRange] = useState(12)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        // Get progress stats
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('status')
          .eq('student_id', user.id)

        const totalAttempted = progressData?.length || 0
        const correctAnswers = progressData?.filter(p => p.status === 'correct').length || 0
        const incorrectAnswers = progressData?.filter(p => p.status === 'incorrect').length || 0
        const skippedAnswers = progressData?.filter(p => p.status === 'skipped').length || 0
        const accuracy = totalAttempted > 0 ? Math.round((correctAnswers / totalAttempted) * 100) : 0

        // Get bookmarks count
        const { count: bookmarksCount } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact' })
          .eq('student_id', user.id)

        // Get subject-wise progress
        const { data: chapterProgressData } = await supabase
          .from('chapter_progress')
          .select('subject_id, total_attempted, correct_count')
          .eq('student_id', user.id)

        // Get contribution timeline data for heatmap (last 365 days)
        const oneYearAgo = new Date()
        oneYearAgo.setDate(oneYearAgo.getDate() - 365)

        const { data: activityData } = await supabase
          .from('student_progress')
          .select('attempted_at')
          .eq('student_id', user.id)
          .gte('attempted_at', oneYearAgo.toISOString())

        const dayMap: Record<string, number> = {}
        activityData?.forEach((item: any) => {
          const date = item.attempted_at ? new Date(item.attempted_at).toISOString().substring(0, 10) : null
          if (!date) return
          dayMap[date] = (dayMap[date] || 0) + 1
        })

        setContributions(dayMap)

        // Group by subject and calculate stats
        const subjectMap = new Map()
        if (chapterProgressData) {
          for (const cp of chapterProgressData) {
            if (!subjectMap.has(cp.subject_id)) {
              subjectMap.set(cp.subject_id, {
                subject_id: cp.subject_id,
                totalQuestions: 0,
                correctAnswers: 0,
              })
            }
            const subject = subjectMap.get(cp.subject_id)
            subject.totalQuestions += cp.total_attempted || 0
            subject.correctAnswers += cp.correct_count || 0
          }
        }

        // Get subject names
        const subjectIds = Array.from(subjectMap.keys())
        let subjectsWithNames: any[] = []
        
        if (subjectIds.length > 0) {
          const { data: subjects } = await supabase
            .from('subjects')
            .select('id, name')
            .in('id', subjectIds)

          subjectsWithNames = (subjects || []).map(s => {
            const stats = subjectMap.get(s.id)
            return {
              id: s.id,
              name: s.name,
              totalQuestions: stats.totalQuestions,
              correctAnswers: stats.correctAnswers,
              accuracy: stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0,
            }
          })

          setSubjectStats(subjectsWithNames)
        }

        setStats({
          totalAttempted,
          correctAnswers,
          incorrectAnswers,
          skippedAnswers,
          accuracy,
          totalBookmarks: bookmarksCount || 0,
        })
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-200 animate-pulse mb-4">
            <BarChart3 className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 mb-2">
        <h1 className="text-4xl font-bold text-pink-900">Your Learning Journey</h1>
        <p className="text-pink-600 text-lg">Track your progress and keep studying</p>
      </div>

      {/* Stats Cards - 2x2 Grid on iPad Air */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Accuracy Card */}
        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-600">Overall Accuracy</CardTitle>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-rose-100">
                <TrendingUp className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-rose-600">{stats.accuracy}%</div>
            <p className="text-sm text-slate-500 mt-2">{stats.totalAttempted} questions attempted</p>
          </CardContent>
        </Card>

        {/* Correct Answers Card */}
        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-600">Correct Answers</CardTitle>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{stats.correctAnswers}</div>
            <p className="text-sm text-slate-500 mt-2">{stats.correctAnswers} / {stats.totalAttempted}</p>
          </CardContent>
        </Card>

        {/* Bookmarks Card */}
        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-600">Bookmarks</CardTitle>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-rose-100">
                <BookmarkIcon className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-rose-600">{stats.totalBookmarks}</div>
            <p className="text-sm text-slate-500 mt-2">Questions for later</p>
          </CardContent>
        </Card>

        {/* Subject Progress Card */}
        <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-600">Progress</CardTitle>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">{subjectStats.length}</div>
            <p className="text-sm text-slate-500 mt-2">Subjects in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card className="border-rose-100 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Activity Heatmap</CardTitle>
              <CardDescription>Your study activity over the last year</CardDescription>
            </div>
            <select
              value={yearRange}
              onChange={(e) => setYearRange(Number(e.target.value))}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-rose-300 transition-colors"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(16px,1fr))] gap-1">
            {(() => {
              const days: string[] = []
              const today = new Date()
              const daysCount = Math.round(yearRange * 30.5)
              for (let i = 0; i < daysCount; i++) {
                const d = new Date()
                d.setDate(today.getDate() - i)
                days.push(d.toISOString().substring(0, 10))
              }
              return days.reverse().map((date) => {
                const value = contributions[date] || 0
                let shadeClass = 'bg-rose-50 border-rose-100'
                if (value === 0) shadeClass = 'bg-rose-50 border-rose-100'
                else if (value <= 2) shadeClass = 'bg-rose-200 border-rose-200'
                else if (value <= 5) shadeClass = 'bg-rose-400 border-rose-400'
                else if (value <= 10) shadeClass = 'bg-rose-500 border-rose-500'
                else shadeClass = 'bg-rose-600 border-rose-600'
                
                return (
                  <div
                    key={date}
                    className={`h-4 w-4 rounded-sm border ${shadeClass} hover:ring-2 hover:ring-rose-300 cursor-pointer transition-all`}
                    title={`${date}: ${value} questions`}
                  />
                )
              })
            })()}
          </div>
          <p className="text-xs text-slate-500 mt-3">Darker = more activity. Hover for daily count.</p>
        </CardContent>
      </Card>

      {/* Subject Performance */}
      {subjectStats.length > 0 && (
        <Card className="border-rose-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Your accuracy by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subjectStats.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 hover:bg-rose-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{subject.name}</p>
                    <p className="text-sm text-slate-500">{subject.totalQuestions} questions</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-rose-600">{subject.accuracy}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-2xl p-8 text-white shadow-lg">
        <h3 className="text-2xl font-bold mb-2">Ready to improve?</h3>
        <p className="text-rose-100 mb-6">Keep practicing to boost your accuracy and master all topics.</p>
        <Link 
          href="/student/subjects"
          className="inline-block px-6 py-3 bg-white text-rose-600 font-semibold rounded-lg hover:bg-rose-50 transition-colors"
        >
          Browse Subjects →
        </Link>
      </div>
    </div>
  )
}
