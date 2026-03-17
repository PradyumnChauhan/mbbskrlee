'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Plus } from 'lucide-react'

interface Book {
  id: string
  name: string
  edition?: string
}

export default function AdminUploadPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [chapters, setChapters] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')
  
  // Single question form
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq',
    text: '',
    options: ['', '', '', ''],
    correctOption: '0',
    explanation: '',
  })

  // New chapter form
  const [chapterForm, setChapterForm] = useState({
    code: '',
    name: '',
  })

  const [showNewChapter, setShowNewChapter] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [bulkChaptersJson, setBulkChaptersJson] = useState('')
  const [showBulkChapters, setShowBulkChapters] = useState(false)
  const [isCreatingBulkChapters, setIsCreatingBulkChapters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      loadBooksForSubject(selectedSubject)
      setSelectedBook('')
      setSelectedChapter('')
    }
  }, [selectedSubject])

  useEffect(() => {
    if (selectedBook) {
      loadChaptersForBook(selectedBook)
      setSelectedChapter('')
    }
  }, [selectedBook])

  const loadSubjects = async () => {
    try {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')

      setSubjects(data || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    }
  }

  const loadBooksForSubject = async (subjectId: string) => {
    try {
      const { data } = await supabase
        .from('books')
        .select('id, name, edition')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })

      setBooks(data || [])
    } catch (error) {
      console.error('Failed to load books:', error)
    }
  }

  const loadChaptersForBook = async (bookId: string) => {
    try {
      const { data } = await supabase
        .from('chapters')
        .select('id, chapter_name, chapter_code')
        .eq('book_id', bookId)
        .order('chapter_code')

      setChapters(data || [])
    } catch (error) {
      console.error('Failed to load chapters:', error)
    }
  }

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterForm.code || !chapterForm.name || !selectedBook) return

    try {
      const { error } = await supabase
        .from('chapters')
        .insert([
          {
            book_id: selectedBook,
            chapter_code: chapterForm.code,
            chapter_name: chapterForm.name,
          },
        ])

      if (error) throw error

      setChapterForm({ code: '', name: '' })
      setShowNewChapter(false)
      await loadChaptersForBook(selectedBook)
    } catch (error) {
      console.error('Failed to create chapter:', error)
      alert('Failed to create chapter')
    }
  }

  const handleBulkCreateChapters = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBook || !bulkChaptersJson.trim()) {
      alert('Please select a book and provide chapter data')
      return
    }

    setIsCreatingBulkChapters(true)
    try {
      const chaptersData = JSON.parse(bulkChaptersJson)
      
      // Convert object format to array format if needed
      const chaptersArray = Array.isArray(chaptersData)
        ? chaptersData
        : Object.entries(chaptersData).map(([code, name]) => ({
            code,
            name,
          }))

      if (chaptersArray.length === 0) {
        throw new Error('No chapters found in JSON')
      }

      // Format for insertion
      const formatted = chaptersArray.map((ch: any) => ({
        book_id: selectedBook,
        chapter_code: ch.code || ch.chapter_code || '',
        chapter_name: ch.name || ch.chapter_name || '',
      }))

      // Validate all chapters have code and name
      if (formatted.some(ch => !ch.chapter_code || !ch.chapter_name)) {
        throw new Error('Each chapter must have both code and name')
      }

      const { error } = await supabase
        .from('chapters')
        .insert(formatted)

      if (error) throw error

      setBulkChaptersJson('')
      setShowBulkChapters(false)
      await loadChaptersForBook(selectedBook)
      alert(`Successfully created ${formatted.length} chapters!`)
    } catch (error) {
      console.error('Failed to create chapters:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create chapters'}`)
    } finally {
      setIsCreatingBulkChapters(false)
    }
  }

  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChapter || !questionForm.text) return

    setIsSubmitting(true)
    try {
      const questionData = {
        type: questionForm.type,
        text: questionForm.text,
        explanation: questionForm.explanation,
      }

      if (questionForm.type === 'mcq') {
        Object.assign(questionData, {
          options: questionForm.options.filter(o => o.trim()),
          correctOption: parseInt(questionForm.correctOption),
        })
      }

      const { error } = await supabase
        .from('questions')
        .insert([
          {
            chapter_id: selectedChapter,
            question_type: questionForm.type,
            question_data: questionData,
          },
        ])

      if (error) throw error

      // Reset form
      setQuestionForm({
        type: 'mcq',
        text: '',
        options: ['', '', '', ''],
        correctOption: '0',
        explanation: '',
      })

      alert('Question added successfully!')
    } catch (error) {
      console.error('Failed to add question:', error)
      alert('Failed to add question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChapter || !bulkJson.trim()) return

    setIsSubmitting(true)
    try {
      const questionsData = JSON.parse(bulkJson)
      if (!Array.isArray(questionsData)) throw new Error('JSON must be an array of questions')

      const formatted = questionsData.map(q => ({
        chapter_id: selectedChapter,
        question_type: q.type || 'mcq',
        question_data: q,
      }))

      const { error } = await supabase
        .from('questions')
        .insert(formatted)

      if (error) throw error

      setBulkJson('')
      alert(`Successfully uploaded ${formatted.length} questions!`)
    } catch (error) {
      console.error('Failed to upload questions:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to upload'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload Questions</h1>
        <p className="text-muted-foreground mt-2">
          Select subject → book → chapter → upload questions
        </p>
      </div>

      {/* Subject, Book, and Chapter Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Subject, Book & Chapter</CardTitle>
          <CardDescription>Navigate the hierarchy to select where to upload questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Book Selection */}
            <div className="space-y-2">
              <Label htmlFor="book">Book</Label>
              <Select value={selectedBook} onValueChange={setSelectedBook} disabled={!selectedSubject}>
                <SelectTrigger id="book">
                  <SelectValue placeholder={selectedSubject ? "Choose a book" : "Select subject first"} />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.name} {book.edition ? `(${book.edition})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chapter Selection */}
            <div className="space-y-2">
              <Label htmlFor="chapter">Chapter</Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedBook}>
                <SelectTrigger id="chapter">
                  <SelectValue placeholder={selectedBook ? "Choose a chapter" : "Select book first"} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter: any) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.chapter_code}: {chapter.chapter_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* New Chapter Form */}
          {showNewChapter && selectedBook && (
            <form onSubmit={handleCreateChapter} className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold">Create New Chapter</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="code">Chapter Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g., CH01"
                    value={chapterForm.code}
                    onChange={(e) => setChapterForm({ ...chapterForm, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Chapter Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Anatomy Basics"
                    value={chapterForm.name}
                    onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Create Chapter</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewChapter(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Bulk Create Chapters Form */}
          {showBulkChapters && selectedBook && (
            <form onSubmit={handleBulkCreateChapters} className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold">Bulk Create Chapters</h3>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm text-muted-foreground space-y-2">
                <p>Paste JSON with chapter codes and names. Two formats accepted:</p>
                <div className="font-mono text-xs bg-background p-2 rounded">
                  {`// Format 1 (Object):\n{\n  "CH_1": "Introduction to the upper limb",\n  "CH_2": "Bones of the upper limb"\n}\n\n// Format 2 (Array):\n[{"code": "CH_1", "name": "Introduction"}]`}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkChapters">Paste JSON Chapters</Label>
                <Textarea
                  id="bulkChapters"
                  placeholder='Paste JSON here, e.g. { "CH_1": "Chapter Name", "CH_2": "Another Chapter" }'
                  value={bulkChaptersJson}
                  onChange={(e) => setBulkChaptersJson(e.target.value)}
                  className="font-mono text-sm"
                  rows={12}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isCreatingBulkChapters} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {isCreatingBulkChapters ? 'Creating...' : 'Create Chapters'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBulkChapters(false)
                    setBulkChaptersJson('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Toggle Buttons for Chapter Creation */}
          {selectedBook && !showNewChapter && !showBulkChapters && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewChapter(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Single Chapter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkChapters(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Bulk Chapters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Tabs */}
      {selectedChapter && (
        <Card>
          <CardHeader>
            <CardTitle>Add Questions</CardTitle>
            <CardDescription>
              Choose how you want to upload questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadMode} onValueChange={(v: any) => setUploadMode(v)}>
              <TabsList>
                <TabsTrigger value="single">Single Question</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Upload (JSON)</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 mt-6">
                <form onSubmit={handleAddSingleQuestion} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qtype">Question Type</Label>
                    <Select
                      value={questionForm.type}
                      onValueChange={(value) =>
                        setQuestionForm({ ...questionForm, type: value })
                      }
                    >
                      <SelectTrigger id="qtype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="subjective">Subjective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qtext">Question Text</Label>
                    <Textarea
                      id="qtext"
                      placeholder="Enter the question"
                      value={questionForm.text}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, text: e.target.value })
                      }
                      required
                    />
                  </div>

                  {questionForm.type === 'mcq' && (
                    <>
                      <div className="space-y-3">
                        <Label>Options</Label>
                        {questionForm.options.map((option, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              placeholder={`Option ${idx + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options]
                                newOptions[idx] = e.target.value
                                setQuestionForm({
                                  ...questionForm,
                                  options: newOptions,
                                })
                              }}
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correct"
                                value={idx}
                                checked={
                                  questionForm.correctOption === String(idx)
                                }
                                onChange={(e) =>
                                  setQuestionForm({
                                    ...questionForm,
                                    correctOption: e.target.value,
                                  })
                                }
                              />
                              <span className="text-sm">Correct</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="explanation">Explanation (Optional)</Label>
                    <Textarea
                      id="explanation"
                      placeholder="Explain the answer"
                      value={questionForm.explanation}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          explanation: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isSubmitting ? 'Adding...' : 'Add Question'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4 mt-6">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Paste your JSON array of questions below. Each question should have:
                  </p>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto">
{`[
  {
    "text": "Question 1?",
    "type": "mcq",
    "options": ["A", "B", "C", "D"],
    "correctOption": 0,
    "explanation": "..."
  }
]`}
                  </pre>
                </div>

                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <Textarea
                    placeholder="Paste JSON here"
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    className="font-mono text-sm"
                    rows={10}
                  />

                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {isSubmitting ? 'Uploading...' : 'Upload Questions'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
