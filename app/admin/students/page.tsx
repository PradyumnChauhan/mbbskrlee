'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, Target } from 'lucide-react'

type StudentProfile = {
  id: string
  username: string
  full_name: string | null
  role: 'student'
  created_at: string
  is_verified: boolean
  totalAttempted: number
  correctAnswers: number
  accuracy: number
  bookmarks: number
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      // Get all student profiles
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (studentsData) {
        // Get progress stats for each student
        const studentsWithStats = await Promise.all(
          studentsData.map(async (student) => {
            const { count: totalAttempted } = await supabase
              .from('student_progress')
              .select('*', { count: 'exact' })
              .eq('student_id', student.id)

            const { data: progressData } = await supabase
              .from('student_progress')
              .select('status')
              .eq('student_id', student.id)

            const correctCount = progressData?.filter((progressItem) => progressItem.status === 'correct').length || 0
            const accuracy = totalAttempted ? Math.round((correctCount / totalAttempted) * 100) : 0

            const { count: bookmarkCount } = await supabase
              .from('bookmarks')
              .select('*', { count: 'exact' })
              .eq('student_id', student.id)

            return {
              ...student,
              is_verified: Boolean(student.is_verified),
              totalAttempted: totalAttempted || 0,
              correctAnswers: correctCount,
              accuracy,
              bookmarks: bookmarkCount || 0,
            }
          })
        )

        setStudents(studentsWithStats as StudentProfile[])
      }
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationToggle = async (studentId: string, nextValue: boolean) => {
    try {
      setUpdatingStudentId(studentId)

      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: nextValue })
        .eq('id', studentId)
        .eq('role', 'student')

      if (error) {
        console.error('Failed to update verification status:', error)
        return
      }

      setStudents((previousStudents) =>
        previousStudents.map((student) =>
          student.id === studentId
            ? { ...student, is_verified: nextValue }
            : student
        )
      )
    } finally {
      setUpdatingStudentId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading students...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground mt-2">
          Monitor student progress and verify access
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Students</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((student) => student.is_verified).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((student) => !student.is_verified).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                No students registered yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>
              Approve students before they can access student panel content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Verification</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Correct</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead className="text-right">Bookmarks</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.full_name || student.username}
                      </TableCell>
                      <TableCell>
                        {student.is_verified ? (
                          <Badge>Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={student.is_verified ? 'outline' : 'default'}
                          disabled={updatingStudentId === student.id}
                          onClick={() => handleVerificationToggle(student.id, !student.is_verified)}
                        >
                          {updatingStudentId === student.id
                            ? 'Saving...'
                            : student.is_verified
                              ? 'Revoke'
                              : 'Verify'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.totalAttempted}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {student.correctAnswers}
                      </TableCell>
                      <TableCell className="text-right">
                        {student.accuracy}%
                      </TableCell>
                      <TableCell className="text-right">
                        {student.bookmarks}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
