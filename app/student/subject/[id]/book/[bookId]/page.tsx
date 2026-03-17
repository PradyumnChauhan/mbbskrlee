'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'

interface Chapter {
  id: string
  chapter_code: string
  chapter_name: string
  description?: string
}

interface Book {
  id: string
  name: string
  edition?: string
  description?: string
}

interface Subject {
  id: string
  name: string
}

export default function BookDetailPage() {
  const params = useParams()
  const subjectId = params.id as string
  const bookId = params.bookId as string
  
  const [subject, setSubject] = useState<Subject | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterStats, setChapterStats] = useState<any>({})
  const [chapterQuestionCounts, setChapterQuestionCounts] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get subject
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single()

        setSubject(subjectData)

        // Get book
        const { data: bookData } = await supabase
          .from('books')
          .select('*')
          .eq('id', bookId)
          .single()

        setBook(bookData)

        // Get chapters for this book
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('*')
          .eq('book_id', bookId)
          .order('chapter_code', { ascending: true })

        // Sort chapters numerically by extracting the number from chapter_code
        const sortedChapters = (chaptersData || []).sort((a: any, b: any) => {
          const numA = parseInt(a.chapter_code?.replace(/\D/g, '') || '0')
          const numB = parseInt(b.chapter_code?.replace(/\D/g, '') || '0')
          return numA - numB
        })

        setChapters(sortedChapters)

        // Get question counts by type for these chapters
        const chapterIds = (sortedChapters || []).map(c => c.id)
        console.log('📚 BOOK PAGE DEBUG - Chapters loaded:', sortedChapters?.length)
        console.log('📚 BOOK PAGE DEBUG - Chapter IDs in this book:', chapterIds)
        
        // Initialize chapter counts
        const chapterCounts: any = {}
        chaptersData?.forEach((c: any) => {
          chapterCounts[c.id] = {
            mcq: 0,
            short_essay: 0,
            long_essay: 0,
            short_note: 0,
            total: 0,
          }
        })

        // Fetch questions with pagination to bypass 1000 limit
        let allQuestions: any[] = []
        let pageIndex = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data: pageData, error } = await supabase
            .from('questions')
            .select('chapter_id, question_type, question_data')
            .in('chapter_id', chapterIds)
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)

          if (error) {
            console.error('❌ Error fetching questions:', error)
            break
          }

          if (!pageData || pageData.length === 0) {
            hasMore = false
          } else {
            allQuestions = [...allQuestions, ...pageData]
            pageIndex++
          }
        }

        console.log('❓ BOOK PAGE DEBUG - Total questions fetched:', allQuestions.length)

        const counts: any = {
          mcq: 0,
          short_essay: 0,
          long_essay: 0,
          short_note: 0,
        }

        // Process questions
        allQuestions.forEach((q: any) => {
          const qData = typeof q?.question_data === 'string' 
            ? JSON.parse(q?.question_data) 
            : q?.question_data
            
          // Get category from JSON structure
          let kind = qData?.kind || ''
          let category = qData?.category || ''
          
          let key = ''
          
          if (kind === 'mcq') {
            key = 'mcq'
          } else if (kind === 'subjective') {
            if (category === 'short_note') key = 'short_note'
            else if (category === 'short_essay') key = 'short_essay'
            else if (category === 'long_essay') key = 'long_essay'
            else key = 'short_essay' // default
          }

          if (key) {
            counts[key] += 1
            
            if (q.chapter_id && chapterCounts[q.chapter_id]) {
              chapterCounts[q.chapter_id][key] += 1
              chapterCounts[q.chapter_id].total += 1
            }
          }
        })
        
        console.log('📊 BOOK PAGE DEBUG - Final chapter counts:', chapterCounts)
        console.log('📊 BOOK PAGE DEBUG - Global counts:', counts)
        console.log('📊 BOOK PAGE DEBUG - Total counts:', counts)
        console.log('📊 BOOK PAGE DEBUG - SUMMARY:', {
          chapters_in_book: chapterIds.length,
          total_questions_fetched: allQuestions?.length,
          questions_counted_in_chapters: Object.values(chapterCounts).reduce((sum: number, ch: any) => sum + (ch.total || 0), 0),
          questions_in_global_count: counts.mcq + counts.short_essay + counts.long_essay + counts.short_note,
          mismatch: Object.values(chapterCounts).reduce((sum: number, ch: any) => sum + (ch.total || 0), 0) !== (counts.mcq + counts.short_essay + counts.long_essay + counts.short_note)
        })
        
        setQuestionCounts(counts)
        setChapterQuestionCounts(chapterCounts)

        // Get chapter progress
        const { data: { user } } = await supabase.auth.getUser()
        if (user && sortedChapters) {
          const chapterIds = sortedChapters.map((c: any) => c.id)
          const { data: chapterProgressData } = await supabase
            .from('chapter_progress')
            .select('chapter_id, total_attempted, correct_count')
            .eq('student_id', user.id)
            .in('chapter_id', chapterIds)

          const stats: any = {}
          sortedChapters.forEach((chapter: any) => {
            const cp = chapterProgressData?.find((item: any) => item.chapter_id === chapter.id)
            stats[chapter.id] = {
              attempted: cp?.total_attempted || 0,
              correct: cp?.correct_count || 0,
              total: chapterCounts[chapter.id]?.mcq || 0,
            }
          })

          setChapterStats(stats)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [subjectId, bookId, supabase])

  const [questionCounts, setQuestionCounts] = useState<any>({})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!subject || !book) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/student/subjects" className="hover:text-foreground">
          Subjects
        </Link>
        <span>/</span>
        <Link href={`/student/subject/${subjectId}`} className="hover:text-foreground">
          {subject.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{book.name}</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">{book.name}</h1>
        {book.edition && (
          <p className="text-muted-foreground mt-1">{book.edition}</p>
        )}
        {book.description && (
          <p className="text-muted-foreground mt-2">{book.description}</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Select a Chapter</h2>
        <p className="text-muted-foreground mb-4">
          Choose a chapter to practice questions.
        </p>
      </div>

      {chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                No chapters available in this book yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {chapters.map((chapter) => {
              const stats = chapterStats[chapter.id] || { attempted: 0, correct: 0, total: 0 }
              const progressPercent = stats.total > 0 ? (stats.attempted / stats.total) * 100 : 0

              return (
                <Card key={chapter.id} className="hover:shadow-lg transition-shadow">
                  <Link href={`/student/chapter/${chapter.id}`}>
                    <CardHeader className="cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            {chapter.chapter_code}: {chapter.chapter_name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {stats.total} MCQ questions
                          </CardDescription>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </Link>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { id: 'mcq', label: 'MCQ' },
                          { id: 'short_essay', label: 'Short Essay' },
                          { id: 'long_essay', label: 'Long Essay' },
                          { id: 'short_note', label: 'Short Note' },
                        ].map(item => {
                          const count = (chapterQuestionCounts[chapter.id]?.[item.id] || 0)
                          return (
                            <Link
                              key={item.id}
                              href={`/student/chapter/${chapter.id}?type=${item.id}`}
                              className="block rounded-lg border border-muted p-2 hover:border-primary transition-all"
                            >
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{count} questions</div>
                            </Link>
                          )
                        })}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{stats.attempted}/{stats.total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {stats.correct} correct
                        </span>
                        <span className="text-muted-foreground">
                          • {Math.max(0, stats.attempted - stats.correct)} incorrect
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
