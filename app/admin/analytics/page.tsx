'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, TrendingUp, Target, Activity, Download, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const COLORS = ['#ec4899', '#f472b6', '#fbaccc', '#fce7f3', '#fdf2f8']

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'summary'
  const selectedStudentId = searchParams.get('student_id')

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalAttempts: 0,
    overallAccuracy: 0,
    activeNow: 0,
  })

  const [allStudents, setAllStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentHierarchy, setStudentHierarchy] = useState<any[]>([])
  const [studentsMetrics, setStudentMetrics] = useState<any>(null)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())
  const [dailyTrendsData, setDailyTrendsData] = useState<any[]>([])
  const [selectedTrendDate, setSelectedTrendDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [accuracyFilter, setAccuracyFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const supabase = createClient()

  // Initial load
  useEffect(() => {
    loadDashboard()
  }, [])

  // Fetch student detail data when selected student changes
  useEffect(() => {
    if (selectedStudentId && allStudents.length > 0) {
      const student = allStudents.find(s => s.id === selectedStudentId)
      if (student) {
        setSelectedStudent(student)
        loadStudentDetails(selectedStudentId)
      }
    }
  }, [selectedStudentId, allStudents])

  const loadStudentDetails = async (studentId: string) => {
    try {
      setDetailLoading(true)

      // Load hierarchy
      const hierarchyRes = await fetch(`/api/analytics/student-analytics?student_id=${studentId}`)
      const hierarchyData = await hierarchyRes.json()
      setStudentHierarchy(hierarchyData)

      // Load comparison metrics
      const metricsRes = await fetch(`/api/analytics/comparison-metrics?student_id=${studentId}`)
      const metricsData = await metricsRes.json()
      setStudentMetrics(metricsData)
    } catch (error) {
      console.error('Failed to load student details:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const loadDashboard = async () => {
    try {
      // Load summary stats
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'student')

      const { count: questionCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact' })

      const { data: progressData } = await supabase
        .from('student_progress')
        .select('status')

      const totalAttempts = progressData?.length || 0
      const correctAttempts = progressData?.filter(p => p.status === 'correct').length || 0
      const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

      // Get active now count
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 5)

      const { data: recentActivity } = await supabase
        .from('student_progress')
        .select('student_id', { count: 'exact' })
        .gte('attempted_at', cutoffTime.toISOString())

      const uniqueActiveStudents = new Set((recentActivity || []).map(a => a.student_id)).size

      setStats({
        totalStudents: studentCount || 0,
        totalQuestions: questionCount || 0,
        totalAttempts,
        overallAccuracy,
        activeNow: uniqueActiveStudents,
      })

      // Load all students
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      const studentsWithMetrics = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: pData } = await supabase
            .from('student_progress')
            .select('status, attempted_at')
            .eq('student_id', profile.id)

          const total = pData?.length || 0
          const correct = pData?.filter(p => p.status === 'correct').length || 0
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

          const { count: bookmarks } = await supabase
            .from('bookmarks')
            .select('*', { count: 'exact' })
            .eq('student_id', profile.id)

          const lastAttempt = pData?.[pData.length - 1]?.attempted_at || null

          return {
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            joinDate: profile.created_at,
            totalAttempts: total,
            accuracy,
            bookmarks: bookmarks || 0,
            lastActive: lastAttempt,
          }
        })
      )

      setAllStudents(studentsWithMetrics)

      // Load daily trends
      loadDailyTrends()
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDailyTrends = async () => {
    try {
      setTrendsLoading(true)
      const res = await fetch('/api/analytics/daily-trends?days=30&limit=50')
      const data = await res.json()
      setDailyTrendsData(data)
    } catch (error) {
      console.error('Failed to load daily trends:', error)
    } finally {
      setTrendsLoading(false)
    }
  }

  // Filtered and sorted students list
  const filteredStudents = useMemo(() => {
    let result = [...allStudents]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(s => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term))
    }

    // Accuracy filter
    if (accuracyFilter !== 'all') {
      const [min, max] = accuracyFilter.split('-').map(Number)
      result = result.filter(s => s.accuracy >= min && s.accuracy <= max)
    }

    // Last active filter
    if (activeFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()

      if (activeFilter === '24h') cutoff.setDate(cutoff.getDate() - 1)
      else if (activeFilter === '7d') cutoff.setDate(cutoff.getDate() - 7)
      else if (activeFilter === '30d') cutoff.setDate(cutoff.getDate() - 30)

      if (activeFilter !== 'inactive') {
        result = result.filter(s => s.lastActive && new Date(s.lastActive) > cutoff)
      } else {
        result = result.filter(s => !s.lastActive || new Date(s.lastActive) < cutoff)
      }
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof typeof a]
      const bVal = b[sortColumn as keyof typeof b]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return 0
    })

    return result
  }, [allStudents, searchTerm, accuracyFilter, activeFilter, sortColumn, sortOrder])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student)
    router.push(`/admin/analytics?tab=detail&student_id=${student.id}`)
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Join Date', 'Attempts', 'Accuracy %', 'Bookmarks', 'Last Active']
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      new Date(s.joinDate).toLocaleDateString(),
      s.totalAttempts,
      s.accuracy,
      s.bookmarks,
      s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Never',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive student performance tracking and insights
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={(tab) => router.push(`/admin/analytics?tab=${tab}`)}>
        <TabsList className="grid w-full grid-cols-4 bg-pink-50 dark:bg-pink-950/30">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="detail">Details</TabsTrigger>
          <TabsTrigger value="trends">Daily Trends</TabsTrigger>
        </TabsList>

        {/* TAB 1: SUMMARY */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">{stats.totalStudents}</div>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">{stats.totalQuestions}</div>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">{stats.totalAttempts}</div>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">{stats.overallAccuracy}%</div>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">{stats.activeNow}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 5 minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Struggling Students */}
          <Card className="border-pink-200 dark:border-pink-700">
            <CardHeader>
              <CardTitle>Struggling Students</CardTitle>
              <CardDescription>Students with accuracy below 50%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allStudents
                  .filter(s => s.accuracy < 50 && s.totalAttempts > 0)
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .slice(0, 5)
                  .map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-pink-600">{student.accuracy}%</p>
                        <p className="text-xs text-muted-foreground">{student.totalAttempts} attempts</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader>
                <CardTitle>Accuracy Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { range: '0-20%', count: allStudents.filter(s => s.accuracy < 20 && s.totalAttempts > 0).length },
                        { range: '20-40%', count: allStudents.filter(s => s.accuracy >= 20 && s.accuracy < 40 && s.totalAttempts > 0).length },
                        { range: '40-60%', count: allStudents.filter(s => s.accuracy >= 40 && s.accuracy < 60 && s.totalAttempts > 0).length },
                        { range: '60-80%', count: allStudents.filter(s => s.accuracy >= 60 && s.accuracy < 80 && s.totalAttempts > 0).length },
                        { range: '80-100%', count: allStudents.filter(s => s.accuracy >= 80 && s.totalAttempts > 0).length },
                      ]}
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-700">
              <CardHeader>
                <CardTitle>Student Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Active Last 24h</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {allStudents.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Active Last 7d</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {allStudents.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Inactive (30+ days)</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {allStudents.filter(s => !s.lastActive || new Date(s.lastActive) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: STUDENTS LIST */}
        <TabsContent value="students" className="space-y-6 mt-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] border-pink-200"
              />

              <Select value={accuracyFilter} onValueChange={setAccuracyFilter}>
                <SelectTrigger className="w-[150px] border-pink-200">
                  <SelectValue placeholder="Accuracy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accuracy</SelectItem>
                  <SelectItem value="0-20">0-20%</SelectItem>
                  <SelectItem value="20-40">20-40%</SelectItem>
                  <SelectItem value="40-60">40-60%</SelectItem>
                  <SelectItem value="60-80">60-80%</SelectItem>
                  <SelectItem value="80-100">80-100%</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-[150px] border-pink-200">
                  <SelectValue placeholder="Last Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                  <SelectItem value="30d">Last 30d</SelectItem>
                  <SelectItem value="inactive">Inactive 30+ days</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportCSV} variant="outline" size="sm" className="border-pink-200 hover:bg-pink-50">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Students Table */}
            <Card className="border-pink-200 dark:border-pink-700">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-pink-200 dark:border-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950/50">
                      <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Name
                          {sortColumn === 'name' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('email')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Email
                          {sortColumn === 'email' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('joinDate')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Join Date
                          {sortColumn === 'joinDate' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('totalAttempts')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Attempts
                          {sortColumn === 'totalAttempts' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('accuracy')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Accuracy
                          {sortColumn === 'accuracy' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('bookmarks')} className="cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900">
                        <div className="flex items-center gap-1">
                          Bookmarks
                          {sortColumn === 'bookmarks' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="border-pink-200 dark:border-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950/50">
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{new Date(student.joinDate).toLocaleDateString()}</TableCell>
                        <TableCell>{student.totalAttempts}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-2 bg-pink-100 dark:bg-pink-900 rounded overflow-hidden">
                              <div className="h-full bg-pink-600" style={{ width: `${student.accuracy}%` }} />
                            </div>
                            <span className="font-bold text-pink-600">{student.accuracy}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.bookmarks}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectStudent(student)}
                            className="border-pink-200 hover:bg-pink-50 text-pink-600 hover:text-pink-700"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">Showing {filteredStudents.length} of {allStudents.length} students</p>
          </div>
        </TabsContent>

        {/* TAB 3: PER-STUDENT DETAIL */}
        <TabsContent value="detail" className="space-y-6 mt-6">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student Info Card */}
              <Card className="border-pink-200 dark:border-pink-700 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{selectedStudent.name}</CardTitle>
                      <p className="text-muted-foreground">{selectedStudent.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-pink-600">{selectedStudent.accuracy}%</p>
                      <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Attempts</p>
                      <p className="text-lg font-bold">{selectedStudent.totalAttempts}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bookmarks</p>
                      <p className="text-lg font-bold">{selectedStudent.bookmarks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Join Date</p>
                      <p className="text-lg font-bold">{new Date(selectedStudent.joinDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Active</p>
                      <p className="text-lg font-bold">{selectedStudent.lastActive ? new Date(selectedStudent.lastActive).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Metrics */}
              {studentsMetrics && (
                <Card className="border-pink-200 dark:border-pink-700">
                  <CardHeader>
                    <CardTitle>Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Rank</p>
                        <p className="text-2xl font-bold text-pink-600">Top {studentsMetrics.percentile}%</p>
                      </div>
                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">vs Class Average</p>
                        <p className={`text-2xl font-bold ${studentsMetrics.vsClassAverage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {studentsMetrics.vsClassAverage >= 0 ? '+' : ''}{studentsMetrics.vsClassAverage}%
                        </p>
                      </div>
                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Class Average</p>
                        <p className="text-2xl font-bold">{studentsMetrics.classAverage}%</p>
                      </div>
                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">vs Top 10%</p>
                        <p className={`text-2xl font-bold ${studentsMetrics.vsTop10 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {studentsMetrics.vsTop10 >= 0 ? '+' : ''}{studentsMetrics.vsTop10}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hierarchy Breakdown */}
              <Card className="border-pink-200 dark:border-pink-700">
                <CardHeader>
                  <CardTitle>Performance by Subject → Book → Chapter</CardTitle>
                  <CardDescription>Hierarchical breakdown of student progress</CardDescription>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <p className="text-muted-foreground">Loading hierarchy...</p>
                  ) : studentHierarchy.length > 0 ? (
                    <div className="space-y-2">
                      {studentHierarchy.map(subject => (
                        <div key={subject.subjectId} className="border border-pink-200 dark:border-pink-700 rounded-lg overflow-hidden">
                          {/* Subject Header */}
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedSubjects)
                              if (newExpanded.has(subject.subjectId)) {
                                newExpanded.delete(subject.subjectId)
                              } else {
                                newExpanded.add(subject.subjectId)
                              }
                              setExpandedSubjects(newExpanded)
                            }}
                            className="w-full p-4 hover:bg-pink-50 dark:hover:bg-pink-950/50 flex justify-between items-center bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/50 dark:to-pink-950/50"
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {expandedSubjects.has(subject.subjectId) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <div>
                                <p className="font-bold text-pink-900 dark:text-pink-100">{subject.subjectName}</p>
                                <p className="text-xs text-muted-foreground">{subject.totalAttempted} attempts</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-pink-600">{subject.accuracy}%</p>
                            </div>
                          </button>

                          {/* Books (shown when subject expanded) */}
                          {expandedSubjects.has(subject.subjectId) && (
                            <div className="bg-white dark:bg-slate-950 border-t border-pink-200 dark:border-pink-700">
                              {subject.books.map((book: any) => (
                                <div key={book.bookId} className="border-t border-pink-200 dark:border-pink-700 first:border-t-0">
                                  {/* Book Header */}
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedBooks)
                                      if (newExpanded.has(book.bookId)) {
                                        newExpanded.delete(book.bookId)
                                      } else {
                                        newExpanded.add(book.bookId)
                                      }
                                      setExpandedBooks(newExpanded)
                                    }}
                                    className="w-full p-3 pl-8 hover:bg-pink-50 dark:hover:bg-pink-950/50 flex justify-between items-center"
                                  >
                                    <div className="flex items-center gap-3 flex-1 text-left">
                                      {expandedBooks.has(book.bookId) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{book.bookName}</p>
                                        <p className="text-xs text-muted-foreground">{book.totalAttempted} attempts</p>
                                      </div>
                                    </div>
                                    <p className="text-lg font-bold text-pink-600">{book.accuracy}%</p>
                                  </button>

                                  {/* Chapters (shown when book expanded) */}
                                  {expandedBooks.has(book.bookId) && (
                                    <div className="bg-slate-50 dark:bg-slate-900/50 pl-12 pr-4 py-2">
                                      {book.chapters.map((chapter: any) => (
                                        <div key={chapter.chapterId} className="py-2 px-2 border-l-2 border-pink-300 dark:border-pink-700 mb-2">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <p className="font-medium text-slate-900 dark:text-slate-100">{chapter.chapterName}</p>
                                              <p className="text-xs text-muted-foreground">{chapter.totalAttempted} attempts, {chapter.correctCount} correct</p>
                                            </div>
                                            <p className="text-lg font-bold text-pink-600">{chapter.accuracy}%</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No performance data available</p>
                  )}
                </CardContent>
              </Card>

              <Button variant="outline" onClick={() => router.push('/admin/analytics?tab=students')} className="border-pink-200">
                ← Back to Students List
              </Button>
            </div>
          ) : (
            <Card className="border-pink-200 dark:border-pink-700">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Select a student from the Students tab to view detailed analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: DAILY TRENDS */}
        <TabsContent value="trends" className="space-y-6 mt-6">
          {trendsLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading daily trends...</p>
            </div>
          ) : dailyTrendsData.length > 0 ? (
            <>
              {/* Daily Trends Heatmap */}
              <Card className="border-pink-200 dark:border-pink-700">
                <CardHeader>
                  <CardTitle>Students × Days Activity Heatmap</CardTitle>
                  <CardDescription>30-day activity intensity by student (darker = more attempts)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 mb-4">
                      {/* Date headers */}
                      <div className="w-32 flex-shrink-0" />
                      <div className="flex gap-px">
                        {Array.from({ length: 30 }).map((_, i) => {
                          const date = new Date()
                          date.setDate(date.getDate() - (29 - i))
                          return (
                            <div key={i} className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground">
                              {i % 7 === 0 ? date.getDate() : ''}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Heatmap rows */}
                    <div className="space-y-px">
                      {dailyTrendsData.map(student => {
                        const maxAttempts = Math.max(
                          ...dailyTrendsData.flatMap(s =>
                            s.dailyActivity.map((d: any) => d.attempts)
                          ),
                          1
                        )

                        return (
                          <div key={student.studentId} className="flex gap-2 items-center">
                            <div className="w-32 flex-shrink-0 text-sm truncate font-medium">{student.studentName}</div>
                            <div className="flex gap-px">
                              {Array.from({ length: 30 }).map((_, i) => {
                                const date = new Date()
                                date.setDate(date.getDate() - (29 - i))
                                const dateStr = date.toISOString().split('T')[0]

                                const dayData = student.dailyActivity.find((d: any) => d.date === dateStr)
                                const attempts = dayData?.attempts || 0
                                const intensity = attempts > 0 ? Math.min(attempts / (maxAttempts * 0.8), 1) : 0

                                const colors = [
                                  '#fdf2f8',
                                  '#fce7f3',
                                  '#fbaccc',
                                  '#f472b6',
                                  '#ec4899',
                                ]
                                const colorIndex = Math.floor(intensity * (colors.length - 1))

                                return (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedTrendDate(dateStr)}
                                    className="w-4 h-4 rounded border border-pink-200 dark:border-pink-700 hover:border-pink-600 dark:hover:border-pink-500 transition-all cursor-pointer group relative"
                                    style={{
                                      backgroundColor: colors[colorIndex],
                                    }}
                                    title={`${student.studentName}: ${attempts} attempts`}
                                  >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                      {attempts} attempts
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-6 flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Activity intensity:</span>
                    {COLORS.map((color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border border-pink-200" style={{ backgroundColor: color }} />
                        <span className="text-muted-foreground">{i === COLORS.length - 1 ? 'High' : ''}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Summary */}
              {selectedTrendDate && (
                <Card className="border-pink-200 dark:border-pink-700">
                  <CardHeader>
                    <CardTitle>Daily Summary - {new Date(selectedTrendDate).toLocaleDateString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Students Active</p>
                        <p className="text-2xl font-bold text-pink-600">
                          {dailyTrendsData.filter(s =>
                            s.dailyActivity.some((d: any) => d.date === selectedTrendDate && d.attempts > 0)
                          ).length}
                        </p>
                      </div>

                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Total Attempts</p>
                        <p className="text-2xl font-bold text-pink-600">
                          {dailyTrendsData.reduce((sum, s) => {
                            const day = s.dailyActivity.find((d: any) => d.date === selectedTrendDate)
                            return sum + (day?.attempts || 0)
                          }, 0)}
                        </p>
                      </div>

                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Correct Answers</p>
                        <p className="text-2xl font-bold text-pink-600">
                          {dailyTrendsData.reduce((sum, s) => {
                            const day = s.dailyActivity.find((d: any) => d.date === selectedTrendDate)
                            return sum + (day?.correct || 0)
                          }, 0)}
                        </p>
                      </div>

                      <div className="p-3 bg-pink-50 dark:bg-pink-950/50 rounded-lg border border-pink-200 dark:border-pink-700">
                        <p className="text-xs text-muted-foreground mb-1">Average Accuracy</p>
                        <p className="text-2xl font-bold text-pink-600">
                          {(() => {
                            const total = dailyTrendsData.reduce((sum, s) => {
                              const day = s.dailyActivity.find((d: any) => d.date === selectedTrendDate)
                              return sum + (day?.attempts || 0)
                            }, 0)
                            const correct = dailyTrendsData.reduce((sum, s) => {
                              const day = s.dailyActivity.find((d: any) => d.date === selectedTrendDate)
                              return sum + (day?.correct || 0)
                            }, 0)
                            return total > 0 ? Math.round((correct / total) * 100) : 0
                          })()}%
                        </p>
                      </div>
                    </div>

                    {/* Top performers that day */}
                    <div>
                      <h4 className="font-semibold mb-3">Top Performers</h4>
                      <div className="space-y-2">
                        {dailyTrendsData
                          .map(s => {
                            const day = s.dailyActivity.find((d: any) => d.date === selectedTrendDate)
                            return { ...s, dayData: day }
                          })
                          .filter(s => s.dayData && s.dayData.attempts > 0)
                          .sort((a, b) => (b.dayData?.accuracy || 0) - (a.dayData?.accuracy || 0))
                          .slice(0, 5)
                          .map(student => (
                            <div key={student.studentId} className="flex items-center justify-between p-2 bg-pink-50 dark:bg-pink-950/50 rounded border border-pink-200 dark:border-pink-700">
                              <p className="font-medium">{student.studentName}</p>
                              <div className="text-right">
                                <p className="text-sm font-bold text-pink-600">{student.dayData?.accuracy || 0}%</p>
                                <p className="text-xs text-muted-foreground">{student.dayData?.attempts || 0} attempts</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-pink-200 dark:border-pink-700">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No daily trends data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
