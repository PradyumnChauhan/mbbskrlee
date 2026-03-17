import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get chapter progress data for hierarchy
    const { data: progressData, error } = await supabase
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

    // Structure hierarchically
    const bySubject = new Map<string, any>()

    for (const row of progressData || []) {
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

    const result = Array.from(bySubject.values()).map((subject: any) => ({
      ...subject,
      accuracy: subject.totalAttempted > 0 
        ? Math.round((subject.correctCount / subject.totalAttempted) * 100) 
        : 0,
      books: Array.from(subject.books.values()).map((book: any) => ({
        ...book,
        accuracy: book.totalAttempted > 0 
          ? Math.round((book.correctCount / book.totalAttempted) * 100) 
          : 0,
      })),
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
