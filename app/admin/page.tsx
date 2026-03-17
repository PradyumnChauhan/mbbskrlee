'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, FileText, Play, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalQuestions: 0,
    totalPlaylists: 0,
    totalAttempts: 0,
    successRate: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get total subjects
        const { count: subjectsCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact' })

        // Get total questions
        const { count: questionsCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact' })

        // Get total playlists
        const { count: playlistsCount } = await supabase
          .from('watch_playlists')
          .select('*', { count: 'exact' })

        // Get total attempts and success rate
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('status')

        const totalAttempts = progressData?.length || 0
        const correctAttempts = progressData?.filter(p => p.status === 'correct').length || 0
        const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

        // Get recent activity
        const { data: recentProgressData } = await supabase
          .from('student_progress')
          .select('*, profiles:student_id(full_name)')
          .order('attempted_at', { ascending: false })
          .limit(5)

        setStats({
          totalSubjects: subjectsCount || 0,
          totalQuestions: questionsCount || 0,
          totalPlaylists: playlistsCount || 0,
          totalAttempts,
          successRate,
        })

        setRecentActivity(recentProgressData || [])
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin inline-block mb-4">
            <div className="h-8 w-8 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="text-blue-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 border border-blue-300 shadow-lg">
        <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-blue-100 mt-3 text-lg">
          Manage content and monitor system activity
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Subjects</CardTitle>
            <div className="bg-blue-200 rounded-full p-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.totalSubjects}</div>
            <p className="text-xs text-blue-600 mt-1">Active subjects</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Questions</CardTitle>
            <div className="bg-blue-200 rounded-full p-2">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.totalQuestions}</div>
            <p className="text-xs text-blue-600 mt-1">Total uploaded</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Playlists</CardTitle>
            <div className="bg-blue-200 rounded-full p-2">
              <Play className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.totalPlaylists}</div>
            <p className="text-xs text-blue-600 mt-1">Video playlists</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Attempts</CardTitle>
            <div className="bg-blue-200 rounded-full p-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.totalAttempts}</div>
            <p className="text-xs text-blue-600 mt-1">Total practice</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Success Rate</CardTitle>
            <div className="bg-blue-200 rounded-full p-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.successRate}%</div>
            <p className="text-xs text-blue-600 mt-1">Overall accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-blue-900">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/watch">
            <Card className="border-blue-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Play className="h-5 w-5" />
                  </div>
                  Manage Videos
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Manage video playlists and content
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/subjects">
            <Card className="border-blue-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700">
                  <div className="bg-blue-100 rounded-full p-2">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  Manage Subjects
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Create and organize subjects
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/upload">
            <Card className="border-blue-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700">
                  <div className="bg-blue-100 rounded-full p-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  Upload Questions
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Add new questions to chapters
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-blue-900">Recent Activity</h2>
          <Card className="border-blue-200 bg-white">
            <CardHeader>
              <CardTitle className="text-blue-900">Latest Student Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {activity.status === 'correct' ? (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      ) : activity.status === 'incorrect' ? (
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-300" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium">
                          Question {activity.question_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-blue-600">
                          {new Date(activity.attempted_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'correct' 
                        ? 'bg-blue-100 text-blue-700' 
                        : activity.status === 'incorrect'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
