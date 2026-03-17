'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

interface Chapter {
  id: string
  code: string
  name: string
  questions_count?: number
}

interface Book {
  id: string
  name: string
  edition?: string
  description?: string
  chapters?: Chapter[] | { count: number }[]
}

interface Subject {
  id: string
  name: string
  description?: string
  books?: Book[]
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [books, setBooks] = useState<Record<string, Book[]>>({})
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false)
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false)
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState<string>('')
  const [selectedBookForChapter, setSelectedBookForChapter] = useState<string>('')
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([])
  const [expandedBooks, setExpandedBooks] = useState<string[]>([])
  
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [bookFormData, setBookFormData] = useState({ name: '', description: '', edition: '' })
  const [chapterFormData, setChapterFormData] = useState({ code: '', name: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const { data } = await supabase
        .from('subjects')
        .select('id, name, description')
        .order('created_at', { ascending: false })

      setSubjects(data || [])
      
      // Load books for each subject
      if (data && data.length > 0) {
        for (const subject of data) {
          await loadBooksForSubject(subject.id)
        }
      }
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBooksForSubject = async (subjectId: string) => {
    try {
      const { data } = await supabase
        .from('books')
        .select('id, name, edition, description')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })

      if (data) {
        // Fetch chapter counts for each book
        const booksWithCounts = await Promise.all(
          data.map(async (book) => {
            const { count } = await supabase
              .from('chapters')
              .select('*', { count: 'exact', head: true })
              .eq('book_id', book.id)
            
            return {
              ...book,
              chapters: Array(count || 0).fill(null) // Just for display count
            }
          })
        )

        setBooks(prev => ({
          ...prev,
          [subjectId]: booksWithCounts
        }))
      }
    } catch (error) {
      console.error(`Failed to load books for subject ${subjectId}:`, error)
    }
  }

  const toggleSubjectExpand = (subjectId: string) => {
    setExpandedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const toggleBookExpand = async (bookId: string) => {
    if (!expandedBooks.includes(bookId)) {
      await loadChaptersForBook(bookId)
    }
    setExpandedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    )
  }

  const loadChaptersForBook = async (bookId: string) => {
    try {
      const { data } = await supabase
        .from('chapters')
        .select('id, chapter_code, chapter_name')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })

      if (data) {
        // Fetch question counts for each chapter
        const chaptersWithCounts = await Promise.all(
          data.map(async (ch) => {
            const { count } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('chapter_id', ch.id)
            
            return {
              id: ch.id,
              code: ch.chapter_code,
              name: ch.chapter_name,
              questions_count: count || 0
            }
          })
        )

        setChapters(prev => ({
          ...prev,
          [bookId]: chaptersWithCounts
        }))
      }
    } catch (error) {
      console.error(`Failed to load chapters for book ${bookId}:`, error)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('subjects')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            created_by: user?.id,
          },
        ])

      if (error) throw error

      setFormData({ name: '', description: '' })
      setIsDialogOpen(false)
      await loadSubjects()
    } catch (error) {
      console.error('Failed to create subject:', error)
      alert('Failed to create subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookFormData.name.trim() || !selectedSubjectForBook) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('books')
        .insert([
          {
            subject_id: selectedSubjectForBook,
            name: bookFormData.name,
            description: bookFormData.description,
            edition: bookFormData.edition,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])

      if (error) throw error

      setBookFormData({ name: '', description: '', edition: '' })
      setIsBookDialogOpen(false)
      await loadBooksForSubject(selectedSubjectForBook)
    } catch (error) {
      console.error('Failed to create book:', error)
      alert('Failed to create book')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete all books, chapters, and questions.')) return

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadSubjects()
    } catch (error) {
      console.error('Failed to delete subject:', error)
      alert('Failed to delete subject')
    }
  }

  const handleDeleteBook = async (bookId: string, subjectId: string) => {
    if (!window.confirm('Are you sure? This will delete all chapters and questions in this book.')) return

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)

      if (error) throw error
      await loadBooksForSubject(subjectId)
    } catch (error) {
      console.error('Failed to delete book:', error)
      alert('Failed to delete book')
    }
  }

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterFormData.code.trim() || !chapterFormData.name.trim() || !selectedBookForChapter) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('chapters')
        .insert([
          {
            book_id: selectedBookForChapter,
            chapter_code: chapterFormData.code,
            chapter_name: chapterFormData.name,
          },
        ])

      if (error) throw error

      setChapterFormData({ code: '', name: '' })
      setIsChapterDialogOpen(false)
      await loadChaptersForBook(selectedBookForChapter)
    } catch (error) {
      console.error('Failed to create chapter:', error)
      alert('Failed to create chapter')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteChapter = async (chapterId: string, bookId: string) => {
    if (!window.confirm('Are you sure? This will delete the chapter and all its questions.')) return

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)

      if (error) throw error
      await loadChaptersForBook(bookId)
    } catch (error) {
      console.error('Failed to delete chapter:', error)
      alert('Failed to delete chapter')
    }
  }

  const handleDeleteAllQuestions = async (chapterId: string, bookId: string, chapterName: string) => {
    if (!window.confirm(`Delete all questions in "${chapterName}"? This action cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('chapter_id', chapterId)

      if (error) throw error
      alert('All questions deleted successfully')
      await loadChaptersForBook(bookId)
    } catch (error) {
      console.error('Failed to delete questions:', error)
      alert('Failed to delete questions')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading subjects...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Subjects & Books</h1>
          <p className="text-muted-foreground mt-2">
            Organize subjects and books, then add chapters and questions
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
              <DialogDescription>
                Add a new subject to your question bank
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Anatomy, Biology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the subject"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Subject'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-center">
                No subjects created yet. Create one to get started!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSubjectExpand(subject.id)}>
                    {expandedSubjects.includes(subject.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div>
                      <CardTitle>{subject.name}</CardTitle>
                      <CardDescription>{subject.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {expandedSubjects.includes(subject.id) && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Books List */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">Books in this subject</h3>
                        <Dialog open={isBookDialogOpen && selectedSubjectForBook === subject.id} onOpenChange={(open) => {
                          if (open) setSelectedSubjectForBook(subject.id)
                          setIsBookDialogOpen(open)
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Plus className="h-3 w-3" />
                              Add Book
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Book to {subject.name}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateBook} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="book-name">Book Name</Label>
                                <Input
                                  id="book-name"
                                  placeholder="e.g., Gray's Anatomy"
                                  value={bookFormData.name}
                                  onChange={(e) => setBookFormData({ ...bookFormData, name: e.target.value })}
                                  disabled={isSubmitting}
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="book-edition">Edition</Label>
                                <Input
                                  id="book-edition"
                                  placeholder="e.g., 1st Edition"
                                  value={bookFormData.edition}
                                  onChange={(e) => setBookFormData({ ...bookFormData, edition: e.target.value })}
                                  disabled={isSubmitting}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="book-description">Description</Label>
                                <Input
                                  id="book-description"
                                  placeholder="Brief description of the book"
                                  value={bookFormData.description}
                                  onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                                  disabled={isSubmitting}
                                />
                              </div>

                              <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Book'}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {books[subject.id] && books[subject.id].length > 0 ? (
                        <div className="space-y-2">
                          {books[subject.id].map((book) => (
                            <div key={book.id} className="space-y-2">
                              <Card className="bg-muted">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleBookExpand(book.id)}>
                                        {expandedBooks.includes(book.id) ? (
                                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                          <p className="font-semibold text-sm">{book.name}</p>
                                          {book.edition && <p className="text-xs text-muted-foreground">{book.edition}</p>}
                                          {book.description && <p className="text-xs text-muted-foreground mt-1">{book.description}</p>}
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {chapters[book.id]?.length || 0} chapters
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Dialog open={isChapterDialogOpen && selectedBookForChapter === book.id} onOpenChange={(open) => {
                                        if (open) setSelectedBookForChapter(book.id)
                                        setIsChapterDialogOpen(open)
                                      }}>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Plus className="h-3 w-3" />
                                            Add Chapter
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Add Chapter to {book.name}</DialogTitle>
                                          </DialogHeader>
                                          <form onSubmit={handleCreateChapter} className="space-y-4">
                                            <div className="space-y-2">
                                              <Label htmlFor="chapter-code">Chapter Code</Label>
                                              <Input
                                                id="chapter-code"
                                                placeholder="e.g., CH_1, CH_01"
                                                value={chapterFormData.code}
                                                onChange={(e) => setChapterFormData({ ...chapterFormData, code: e.target.value })}
                                                disabled={isSubmitting}
                                                required
                                              />
                                            </div>

                                            <div className="space-y-2">
                                              <Label htmlFor="chapter-name">Chapter Name</Label>
                                              <Input
                                                id="chapter-name"
                                                placeholder="e.g., Introduction to Anatomy"
                                                value={chapterFormData.name}
                                                onChange={(e) => setChapterFormData({ ...chapterFormData, name: e.target.value })}
                                                disabled={isSubmitting}
                                                required
                                              />
                                            </div>

                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                              {isSubmitting ? 'Adding...' : 'Add Chapter'}
                                            </Button>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteBook(book.id, subject.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Chapters List */}
                              {expandedBooks.includes(book.id) && chapters[book.id] && (
                                <div className="ml-4 space-y-2 border-l-2 border-muted-foreground/20 pl-4 py-2">
                                  {chapters[book.id].length > 0 ? (
                                    chapters[book.id].map((chapter) => (
                                      <Card key={chapter.id} className="bg-white border-muted">
                                        <CardContent className="pt-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <p className="font-semibold text-sm">
                                                {chapter.code} - {chapter.name}
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {chapter.questions_count} questions
                                              </p>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteAllQuestions(chapter.id, book.id, chapter.name)}
                                                className="text-orange-600 hover:text-orange-600 hover:bg-orange-50"
                                              >
                                                Clear Questions
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteChapter(chapter.id, book.id)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-2">No chapters added yet.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No books added yet. Click "Add Book" to create one.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
