import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PUT /api/chapters/[id]
 * Update a chapter
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await props.params
    const chapterId = params.id

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
        { error: 'Only admins can update chapters' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { chapter_code, chapter_name, description } = body

    const { data, error } = await supabase
      .from('chapters')
      .update({
        chapter_code,
        chapter_name,
        description,
      })
      .eq('id', chapterId)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error('Failed to update chapter:', error)
    return NextResponse.json(
      { error: 'Failed to update chapter' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chapters/[id]
 * Delete a chapter and all its questions
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await props.params
    const chapterId = params.id

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
        { error: 'Only admins can delete chapters' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)

    if (error) throw error

    return NextResponse.json({ message: 'Chapter deleted successfully' })
  } catch (error) {
    console.error('Failed to delete chapter:', error)
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    )
  }
}
