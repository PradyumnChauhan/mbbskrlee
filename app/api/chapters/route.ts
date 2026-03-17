import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/chapters?book_id=<uuid>
 * List all chapters for a book
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('book_id')
    const subjectId = searchParams.get('subject_id') // For backward compatibility

    if (!bookId && !subjectId) {
      return NextResponse.json(
        { error: 'book_id or subject_id query parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
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
      .order('chapter_code')

    if (bookId) {
      query = query.eq('book_id', bookId)
    } else if (subjectId) {
      // For backward compatibility, fetch books first then chapters
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .eq('subject_id', subjectId)

      if (!books || books.length === 0) {
        return NextResponse.json({ data: [] })
      }

      const bookIds = books.map(b => b.id)
      query = query.in('book_id', bookIds)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch chapters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chapters
 * Create a new chapter in a book
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create chapters' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { book_id, chapter_code, chapter_name, description, subject_id } = body

    // Support both book_id (new) and subject_id (old) for migration
    let finalBookId = book_id
    if (!finalBookId && subject_id) {
      // Legacy mode: use first book of the subject
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .eq('subject_id', subject_id)
        .limit(1)

      if (books && books.length > 0) {
        finalBookId = books[0].id
      }
    }

    if (!finalBookId || !chapter_code || !chapter_name) {
      return NextResponse.json(
        { error: 'book_id, chapter_code, and chapter_name are required' },
        { status: 400 }
      )
    }

    // Check if book exists
    const { data: book } = await supabase
      .from('books')
      .select('id')
      .eq('id', finalBookId)
      .single()

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('chapters')
      .insert([
        {
          book_id: finalBookId,
          chapter_code,
          chapter_name,
          description,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Failed to create chapter:', error)
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    )
  }
}
