import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')

    if (!subjectId) {
      // Get all providers
      const { data, error } = await supabase
        .from('video_providers')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }

    // Get providers for specific subject
    const { data, error } = await supabase
      .from('video_providers')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { subject_id, name, description } = body

    if (!subject_id || !name) {
      return NextResponse.json({ error: 'Missing required fields: subject_id, name' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('video_providers')
      .insert([{ subject_id, name, description }])
      .select()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Provider already exists for this subject' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating provider:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
