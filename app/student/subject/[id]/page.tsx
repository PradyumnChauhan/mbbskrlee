'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, BookOpen, ChevronLeft } from 'lucide-react'

interface Book {
  id: string
  name: string
  edition?: string
  description?: string
  chapters?: any[]
  chapterCount?: number
}

export default function SubjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.id as string
  const [subject, setSubject] = useState<any>(null)
  const [books, setBooks] = useState<Book[]>([])
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

        // Get books for this subject with chapter counts
        const { data: booksData } = await supabase
          .from('books')
          .select('id, name, edition, description')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false })

        if (booksData) {
          const booksWithCounts = await Promise.all(
            (booksData || []).map(async (book) => {
              const { count } = await supabase
                .from('chapters')
                .select('*', { count: 'exact', head: true })
                .eq('book_id', book.id)
              
              return {
                ...book,
                chapterCount: count || 0
              }
            })
          )
          setBooks(booksWithCounts)
        }
      } catch (error) {
        console.error('Failed to load subject:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    const handleFocus = () => {
      loadData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [subjectId, supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-200 animate-pulse mb-4">
            <BookOpen className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading books...</p>
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Subject not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-rose-600 hover:bg-rose-50"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <span className="text-slate-400">/</span>
        <span className="text-sm text-slate-600">{subject.name}</span>
      </div>

      {/* Subject Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">{subject.name}</h1>
        {subject.description && (
          <p className="text-slate-500 text-lg">{subject.description}</p>
        )}
      </div>

      {/* Books Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Select a Book</h2>
        
        {books.length === 0 ? (
          <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-rose-100">
                  <BookOpen className="h-8 w-8 text-rose-600" />
                </div>
                <p className="text-slate-600 font-medium">No books available</p>
                <p className="text-slate-500">No books in this subject yet. Check back soon!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {books.map((book, index) => (
              <Link key={book.id} href={`/student/subject/${subjectId}/book/${book.id}`} className="group">
                <Card className="h-full border-rose-100 hover:shadow-lg hover:border-rose-200 transition-all duration-300 overflow-hidden">
                  {/* Gradient bar */}
                  <div className="h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-rose-100 mb-2 group-hover:scale-110 transition-transform">
                          <BookOpen className="h-5 w-5 text-rose-600" />
                        </div>
                        <CardTitle className="text-lg group-hover:text-rose-600 transition-colors line-clamp-1">{book.name}</CardTitle>
                        {book.edition && (
                          <p className="text-sm text-slate-500 mt-1">{book.edition}</p>
                        )}
                        {book.description && (
                          <CardDescription className="mt-2 line-clamp-2">{book.description}</CardDescription>
                        )}
                        <p className="text-sm font-medium text-rose-600 mt-3">
                          {book.chapterCount} {book.chapterCount === 1 ? 'chapter' : 'chapters'}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Button className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white group-hover:shadow-lg transition-all">
                      View Chapters
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
