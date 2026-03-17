'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'

interface Book {
  id: string
  name: string
  edition?: string
  description?: string
  chapters?: { length: number }
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

        // Get books for this subject
        const { data: booksData } = await supabase
          .from('books')
          .select(`
            id,
            name,
            edition,
            description,
            chapters(count)
          `)
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false })

        setBooks(booksData || [])
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Subject not found</p>
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
        <span className="text-foreground font-medium">{subject.name}</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">{subject.name}</h1>
        <p className="text-muted-foreground mt-2">{subject.description}</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Select a Book</h2>
        <p className="text-muted-foreground mb-4">
          Choose a book to view its chapters and practice questions.
        </p>
      </div>

      {books.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                No books available in this subject yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {books.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <Link href={`/student/subject/${subjectId}/book/${book.id}`}>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {book.name}
                      </CardTitle>
                      {book.edition && (
                        <CardDescription className="mt-1">
                          {book.edition}
                        </CardDescription>
                      )}
                      {book.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {book.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        {book.chapters?.length || 0} chapters
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
