import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')

    if (!providerId) {
      // Get all versions
      const { data, error } = await supabase
        .from('provider_versions')
        .select('*, video_providers(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }

    // Get versions for specific provider
    const { data, error } = await supabase
      .from('provider_versions')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
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
    const { provider_id, version_name, description } = body

    if (!provider_id || !version_name) {
      return NextResponse.json(
        { error: 'Missing required fields: provider_id, version_name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('provider_versions')
      .insert([{ provider_id, version_name, description }])
      .select()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Version already exists for this provider' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
  }
}
