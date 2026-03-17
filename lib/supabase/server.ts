import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

/**
 * Get all books for a subject
 */
export async function getBooksBySubject(subjectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('books')
    .select(`
      id,
      name,
      description,
      edition,
      created_at,
      chapters(count)
    `)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get all chapters for a book
 */
export async function getChaptersByBook(bookId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id,
      book_id,
      chapter_code,
      chapter_name,
      description,
      created_at,
      questions(count)
    `)
    .eq('book_id', bookId)
    .order('chapter_code')

  if (error) throw error
  return data
}

/**
 * Get questions for a chapter
 */
export async function getQuestionsByChapter(chapterId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at')

  if (error) throw error
  return data
}

/**
 * Get per-student analytics with full hierarchy breakdown
 */
export async function getPerStudentAnalytics(studentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chapter_progress')
    .select(`
      subject_id,
      subject_name,
      book_id,
      book_name,
      chapter_id,
      chapter_name,
      total_attempted,
      correct_count,
      accuracy_percentage
    `)
    .eq('student_id', studentId)

  if (error) throw error

  // Structure data hierarchically
  const bySubject = new Map<string, any>()

  for (const row of data || []) {
    const subjectKey = row.subject_id
    if (!bySubject.has(subjectKey)) {
      bySubject.set(subjectKey, {
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        books: new Map(),
        totalAttempted: 0,
        correctCount: 0,
      })
    }

    const subject = bySubject.get(subjectKey)
    subject.totalAttempted += row.total_attempted || 0
    subject.correctCount += row.correct_count || 0

    const bookKey = row.book_id
    if (!subject.books.has(bookKey)) {
      subject.books.set(bookKey, {
        bookId: row.book_id,
        bookName: row.book_name,
        chapters: [],
        totalAttempted: 0,
        correctCount: 0,
      })
    }

    const book = subject.books.get(bookKey)
    book.totalAttempted += row.total_attempted || 0
    book.correctCount += row.correct_count || 0

    book.chapters.push({
      chapterId: row.chapter_id,
      chapterName: row.chapter_name,
      totalAttempted: row.total_attempted,
      correctCount: row.correct_count,
      accuracy: row.accuracy_percentage,
    })
  }

  // Convert maps to arrays
  const result = Array.from(bySubject.values()).map(subject => ({
    ...subject,
    accuracy: subject.totalAttempted > 0 
      ? Math.round((subject.correctCount / subject.totalAttempted) * 100) 
      : 0,
    books: Array.from(subject.books.values()).map(book => ({
      ...book,
      accuracy: book.totalAttempted > 0 
        ? Math.round((book.correctCount / book.totalAttempted) * 100) 
        : 0,
    })),
  }))

  return result
}

/**
 * Get student daily activity for heatmap (last N days)
 */
export async function getStudentDailyActivity(studentId: string, days: number = 90) {
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

  // Convert to array with accuracy
  return Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    attempts: data.attempts,
    correct: data.correct,
    accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
  }))
}

/**
 * Get all students with performance metrics for filtering/sorting
 */
export async function getAllStudentsWithMetrics() {
  const supabase = await createClient()

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (profileError) throw profileError

  // Get metrics for each student
  const result = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('status, attempted_at')
        .eq('student_id', profile.id)

      const totalAttempts = progressData?.length || 0
      const correctCount = progressData?.filter(p => p.status === 'correct').length || 0
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

      const { count: bookmarkCount } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact' })
        .eq('student_id', profile.id)

      const lastAttempt = progressData?.[progressData.length - 1]?.attempted_at || null

      return {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        joinDate: profile.created_at,
        totalAttempts,
        accuracy,
        bookmarks: bookmarkCount || 0,
        lastActive: lastAttempt,
      }
    })
  )

  return result
}

/**
 * Get students with low accuracy (struggling)
 */
export async function getStrugglingStudents(threshold: number = 50, limit: number = 5) {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'student')

  const withMetrics = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('status')
        .eq('student_id', profile.id)

      const totalAttempts = progressData?.length || 0
      const correctCount = progressData?.filter(p => p.status === 'correct').length || 0
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

      return {
        ...profile,
        accuracy,
        totalAttempts,
      }
    })
  )

  return withMetrics
    .filter(s => s.accuracy < threshold && s.totalAttempts > 0)
    .sort((a, b) => b.totalAttempts - a.totalAttempts)
    .slice(0, limit)
}

/**
 * Get students active in the last N minutes
 */
export async function getActiveStudentsNow(sinceMins: number = 5) {
  const supabase = await createClient()

  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - sinceMins)

  const { data, error } = await supabase
    .from('student_progress')
    .select('student_id, attempted_at')
    .gte('attempted_at', cutoffTime.toISOString())

  if (error) throw error

  // Get unique students
  const studentIds = Array.from(new Set((data || []).map(d => d.student_id)))

  // Get their profile info
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds)

  return profiles || []
}

/**
 * Get student rank and comparison metrics
 */
export async function getStudentComparisonMetrics(studentId: string) {
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
  const top10Threshold = Math.ceil(sorted.length * 0.1)
  const bottom10Threshold = sorted.length - Math.ceil(sorted.length * 0.1)

  const top10Avg = Math.round(sorted.slice(0, top10Threshold).reduce((sum, s) => sum + s.accuracy, 0) / top10Threshold)
  const bottom10Avg = Math.round(sorted.slice(bottom10Threshold).reduce((sum, s) => sum + s.accuracy, 0) / Math.ceil(sorted.length * 0.1))

  return {
    currentAccuracy,
    percentile,
    classAverage,
    vsClassAverage: currentAccuracy - classAverage,
    top10Avg,
    vsTop10: currentAccuracy - top10Avg,
    bottom10Avg,
    vsBottom10: currentAccuracy - bottom10Avg,
  }
}
