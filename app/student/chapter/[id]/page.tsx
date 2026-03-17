'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const getQuestionCategory = (question: any) => {
  if (!question) return ''

  // Parse question_data if it's a string
  const qData = typeof question?.question_data === 'string' 
    ? JSON.parse(question?.question_data) 
    : question?.question_data

  const rawType =
    qData?.kind ||  // Check kind first (new data format)
    qData?.category ||
    qData?.type ||
    question?.question_type ||
    question?.category ||
    ''

  const normalized = String(rawType || '').trim().toLowerCase()

  if (['mcq', 'short_note', 'shortessay', 'short essay', 'long_essay', 'longessay', 'long essay', 'subjective'].includes(normalized)) {
    if (normalized === 'shortessay' || normalized === 'short essay') return 'short_essay'
    if (normalized === 'longessay' || normalized === 'long essay') return 'long_essay'
    return normalized === 'subjective' ? 'short_essay' : normalized
  }

  // default subjective if unknown
  return 'short_essay'
}

const getMCQOptions = (question: any) => {
  // Parse question_data if it's a string
  const qData = typeof question?.question_data === 'string' 
    ? JSON.parse(question?.question_data) 
    : question?.question_data

  const options = qData?.options
  if (Array.isArray(options)) return options
  if (options && typeof options === 'object') {
    // Convert object {A: "...", B: "...", ...} to array ["...", "...", ...]
    return Object.keys(options).sort().map(key => options[key])
  }
  return []
}

// Helper to get the correct answer index (0, 1, 2, 3) from letter answer (A, B, C, D)
const getCorrectAnswerIndex = (question: any) => {
  // Parse question_data if it's a string
  const qData = typeof question?.question_data === 'string' 
    ? JSON.parse(question?.question_data) 
    : question?.question_data

  // New format: answer is a letter (A, B, C, D)
  const answer = qData?.answer
  if (answer) {
    const letterIndex = answer.charCodeAt(0) - 'A'.charCodeAt(0)
    if (letterIndex >= 0 && letterIndex <= 3) return letterIndex
  }
  
  // Old format: correctOption is a number (0, 1, 2, 3)
  const correctOption = qData?.correctOption
  if (correctOption !== undefined && !isNaN(Number(correctOption))) {
    return Number(correctOption)
  }
  
  return -1
}

const getVisiblePageIndexes = (currentIndex: number, total: number) => {
  const maxButtons = 9
  if (total <= maxButtons) return Array.from({ length: total }, (_, idx) => idx)

  const pages = new Set<number>()
  pages.add(0)
  pages.add(1)
  pages.add(total - 2)
  pages.add(total - 1)

  for (let i = currentIndex - 1; i <= currentIndex + 1; i++) {
    if (i >= 0 && i < total) pages.add(i)
  }

  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result: (number | '...')[] = []

  let prev = -1
  for (const page of sorted) {
    if (prev !== -1 && page > prev + 1) result.push('...')
    result.push(page)
    prev = page
  }

  return result
}

export default function ChapterPracticePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const chapterId = params.id as string
  const [chapter, setChapter] = useState<any>(null)
  const [book, setBook] = useState<any>(null)
  const [subjectId, setSubjectId] = useState<string>('')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<any>({})
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<Set<string>>(new Set())
  const [chapterProgress, setChapterProgress] = useState<{total_attempted:number,correct_count:number}>({ total_attempted: 0, correct_count: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get chapter info
        const { data: chapterData } = await supabase
          .from('chapters')
          .select('*')
          .eq('id', chapterId)
          .single()

        setChapter(chapterData)

        // Get book info to find subject_id
        if (chapterData?.book_id) {
          const { data: bookData } = await supabase
            .from('books')
            .select('*')
            .eq('id', chapterData.book_id)
            .single()

          setBook(bookData)
          if (bookData?.subject_id) {
            setSubjectId(bookData.subject_id)
          }
        }

        // Get questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('created_at')

        const selectedType = searchParams.get('type')
        const normalizedType = selectedType ? selectedType.toLowerCase() : null
        const filteredQuestions =
          normalizedType && questionsData
            ? questionsData.filter(q => getQuestionCategory(q) === normalizedType)
            : questionsData

        console.log('All filtered questions count:', filteredQuestions?.length || 0)
        setQuestions(filteredQuestions || [])

        // Get user's bookmarks and progress for these questions
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Supabase user', user)
        let answersMap: any = {}
        const attemptedIds = new Set<string>()

        if (user && questionsData) {
          const { data: bookmarkData } = await supabase
            .from('bookmarks')
            .select('question_id')
            .eq('student_id', user.id)
            .in('question_id', questionsData.map((q:any) => q.id))

          setBookmarks(new Set(bookmarkData?.map((b:any) => b.question_id) || []))

          // Load existing answers - no long IN clause to avoid URL limit issues
          const questionIdSet = new Set(filteredQuestions.map((q: any) => String(q.id)))
          const { data: progressData, error: progressError } = await supabase
            .from('student_progress')
            .select('question_id,status,student_answer')
            .eq('student_id', user.id)

          if (progressError) {
            console.error('Failed to fetch progress', progressError)
          }

          const progressList = (progressData || []).filter((p: any) => questionIdSet.has(String(p.question_id)))
          console.log('Progress query list', progressList.length, progressList)

          let typeAttemptedCount = 0
          let typeCorrectCount = 0

          progressList.forEach((p: any) => {
            attemptedIds.add(String(p.question_id))
            const savedAnswer = p.student_answer && typeof p.student_answer === 'object' ? p.student_answer : {}
            answersMap[String(p.question_id)] = {
              ...savedAnswer,
              status: p.status,
            }
            
            // Count attempted and correct for this type (only 'correct' status counts for correct_count)
            typeAttemptedCount++
            if (p.status === 'correct') {
              typeCorrectCount++
            }
          })

          setAnswers(answersMap)
          setAttemptedQuestionIds(attemptedIds)

          // Show progress for selected type only (not entire chapter)
          setChapterProgress({
            total_attempted: typeAttemptedCount,
            correct_count: typeCorrectCount,
          })
        }

        const unattemptedQuestions = (filteredQuestions || []).filter((q: any) => !attemptedIds.has(String(q.id)))
        console.log('Unattempted questions count:', unattemptedQuestions.length, 'attemptedIds:', attemptedIds.size)
        
        // Keep ALL filtered questions, but start from first unanswered
        setQuestions(filteredQuestions)
        
        // Find the index of the first unanswered question in the full list
        const firstUnansweredIndex = filteredQuestions.findIndex((q: any) => !attemptedIds.has(String(q.id)))
        if (firstUnansweredIndex >= 0) {
          setCurrentIndex(firstUnansweredIndex)
        } else {
          setCurrentIndex(0)  // Fallback: all attempted, start at 0
        }
      } catch (error) {
        console.error('Failed to load chapter:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [chapterId, supabase, searchParams])

  const selectedType = searchParams.get('type')?.toLowerCase() || 'all'

  const [timeLeft, setTimeLeft] = useState(60)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false)

  const currentQuestion = questions[currentIndex]
  const questionCategory = getQuestionCategory(currentQuestion)
  const mcqOptions = getMCQOptions(currentQuestion)
  const questionText =
    currentQuestion?.question_data?.text ||
    currentQuestion?.question ||
    currentQuestion?.question_data?.question ||
    'No question text available.'

  // Only initialize currentIndex on first load, not every time answers change
  useEffect(() => {
    if (!questions.length || currentIndex !== 0) return

    const firstUnanswered = questions.findIndex((q: any) => !answers[q.id]?.status)
    if (firstUnanswered >= 0) {
      setCurrentIndex(firstUnanswered)
    }
  }, [questions.length])

  useEffect(() => {
    if (!currentQuestion) return

    const progress = answers[currentQuestion.id]
    const answered = !!progress?.status
    setIsQuestionAnswered(answered)
    setShowExplanation(answered)
    setTimeLeft(60)
  }, [currentQuestion?.id, answers])

  useEffect(() => {
    if (isQuestionAnswered || !currentQuestion) return

    // For MCQ, just show timer but don't auto-skip - user must click Next button
    // For essays/notes, auto-skip after timer
    if (timeLeft <= 0 && questionCategory !== 'mcq') {
      saveProgress('skipped', null, true)
      return
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, isQuestionAnswered, currentQuestion, questionCategory])

  const handleAnswerMCQ = async (optionIndex: number) => {
    if (!currentQuestion?.id || isQuestionAnswered) return

    const correctAnswerIndex = getCorrectAnswerIndex(currentQuestion)
    const isCorrect = correctAnswerIndex !== -1 && correctAnswerIndex === optionIndex
    
    console.log('MCQ Answer Debug:', {
      question_id: currentQuestion.id,
      optionIndex,
      correctAnswerIndex,
      correctAnswer: currentQuestion.question_data?.answer,
      isCorrect,
      question_data: currentQuestion.question_data,
    })
    
    const status = isCorrect ? 'correct' : 'incorrect'

    const updateAnswer = {
      selectedOption: optionIndex,
      status,
    }

    setAnswers((prev: any) => ({
      ...prev,
      [currentQuestion.id]: updateAnswer,
    }))
    setIsQuestionAnswered(true)
    setShowExplanation(true)

    await saveProgress(status, updateAnswer)
  }

  // Essay questions are answered outside app; save _attempted_ directly.
  const handleSaveSubjective = async () => {
    if (!currentQuestion?.id) return
    setIsQuestionAnswered(true)
    setShowExplanation(true)
    await saveProgress('attempted', null, true)
  }

  const handleSkipQuestion = async () => {
    setIsQuestionAnswered(true)
    setShowExplanation(true)
    await saveProgress('skipped', answers[currentQuestion.id] || null, true)
  }

  const toggleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (bookmarks.has(currentQuestion.id)) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', currentQuestion.id)

        const newBookmarks = new Set(bookmarks)
        newBookmarks.delete(currentQuestion.id)
        setBookmarks(newBookmarks)
      } else {
        await supabase
          .from('bookmarks')
          .insert([
            {
              student_id: user.id,
              question_id: currentQuestion.id,
            },
          ])

        setBookmarks(new Set([...bookmarks, currentQuestion.id]))
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    }
  }

  const saveProgress = async (status: string, answerData: any = null, advance: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentQuestion) return

    setIsSubmitting(true)
    try {
      const studentAnswer = answerData ?? answers[currentQuestion.id]

      await supabase.from('student_progress').upsert(
        [
          {
            student_id: user.id,
            question_id: currentQuestion.id,
            status,
            student_answer: studentAnswer,
          },
        ],
        { onConflict: 'student_id,question_id' }
      )

      // Update local answers state for immediate UI consistency
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          ...(prev[currentQuestion.id] || {}),
          ...(studentAnswer || {}),
          status,
        },
      }))

      if (advance && currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading chapter...</p>
      </div>
    )
  }

  if (!chapter || questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          {questions.length === 0 && searchParams.get('type')
            ? 'No questions available for selected category.'
            : 'No questions available.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/student/subject/${subjectId}`}>
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Chapter
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <div>Attempted: {chapterProgress.total_attempted}</div>
        <div>Correct: {chapterProgress.correct_count}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Timer */}
      <div className="flex items-center justify-end text-sm text-muted-foreground">
        Time left: <span className="font-semibold ml-2">{timeLeft}s</span>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">
                  {questionText}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBookmark}
                className="ml-4"
              >
                {bookmarks.has(currentQuestion.id) ? (
                  <BookmarkCheck className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {questionCategory === 'mcq' ? (
              // MCQ Options
              <div className="space-y-3">
                {mcqOptions.length > 0 ? (
                  mcqOptions.map((option: string, idx: number) => {
                    const thisAnswer = answers[currentQuestion?.id]
                    const selectedOption = thisAnswer?.selectedOption
                    const status = thisAnswer?.status
                    const correctAnswerIndex = getCorrectAnswerIndex(currentQuestion)
                    const isCorrectOption = correctAnswerIndex === idx
                    const isSelected = selectedOption === idx

                    const cardClass = status
                      ? isCorrectOption
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : isSelected
                          ? 'border-red-500 bg-red-50 text-red-900'
                          : 'border-muted'
                      : 'border-muted'

                    return (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors ${cardClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="mcq"
                            value={idx}
                            checked={selectedOption === idx}
                            onChange={() => handleAnswerMCQ(Number(idx))}
                            className="mr-3"
                            disabled={!!status}
                          />
                          <span>{option}</span>
                        </div>
                        {status && (
                          <span className={`text-xs font-medium ${status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                            {isCorrectOption ? '✓' : isSelected ? '✗' : ''}
                          </span>
                        )}
                      </label>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No MCQ options available for this question.</p>
                )}
              </div>
            ) : questionCategory === 'short_note' ? (
              // Short note read-only content
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed">
                  {currentQuestion?.question_data?.ideal_answer || currentQuestion?.ideal_answer || 'No short note content available.'}
                </p>
              </div>
            ) : (
              // Short essay / long essay / subjective answer
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed">
                  This is essay practice. Write your answer in your notebook, then mark as done.
                </p>
              </div>
            )}

            {/* Explanation */}
            {showExplanation && currentQuestion.question_data.explanation && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Explanation
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {currentQuestion.question_data.explanation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipQuestion}
                  disabled={isSubmitting || isQuestionAnswered}
                >
                  Skip
                </Button>

                {questionCategory === 'mcq' ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (currentIndex < questions.length - 1) {
                        setCurrentIndex(currentIndex + 1)
                      }
                    }}
                    disabled={!isQuestionAnswered || isSubmitting}
                  >
                    Next
                  </Button>
                ) : questionCategory === 'short_note' ? (
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      setIsQuestionAnswered(true)
                      await saveProgress('attempted', null, true)
                    }}
                    disabled={isSubmitting}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={handleSaveSubjective}
                    disabled={isSubmitting}
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-between items-center flex-wrap">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex flex-wrap gap-2 justify-center">
          {getVisiblePageIndexes(currentIndex, questions.length).map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-sm text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentIndex(Number(page))}
                className={`w-8 h-8 rounded-full transition-colors ${page === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[questions[page]?.id]
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
              >
                {page + 1}
              </button>
            )
          )}
        </div>

        <Button
          disabled={currentIndex === questions.length - 1}
          onClick={() => setCurrentIndex(currentIndex + 1)}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
