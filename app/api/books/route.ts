import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/books?subject_id=<uuid>
 * List all books for a subject
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const subjectId = searchParams.get('subject_id')

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subject_id query parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('books')
      .select(`
        id,
        name,
        description,
        edition,
        subject_id,
        created_at,
        chapters(count)
      `)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/books
 * Create a new book under a subject
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
        { error: 'Only admins can create books' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { subject_id, name, description, edition } = body

    if (!subject_id || !name) {
      return NextResponse.json(
        { error: 'subject_id and name are required' },
        { status: 400 }
      )
    }

    // Check if subject exists
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject_id)
      .single()

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('books')
      .insert([
        {
          subject_id,
          name,
          description,
          edition,
          created_by: user.id,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Failed to create book:', error)
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    )
  }
}
