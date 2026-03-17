import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPlaylistMetadata, isValidYoutubePlaylistUrl } from '@/lib/youtube-utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const versionId = searchParams.get('version_id')

    if (!versionId) {
      // Get all playlists
      const { data, error } = await supabase
        .from('watch_playlists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }

    // Get playlists for specific version
    const { data, error } = await supabase
      .from('watch_playlists')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
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
    const { version_id, youtube_url } = body

    if (!version_id || !youtube_url) {
      return NextResponse.json(
        { error: 'Missing required fields: version_id, youtube_url' },
        { status: 400 }
      )
    }

    // Validate YouTube URL
    if (!isValidYoutubePlaylistUrl(youtube_url)) {
      return NextResponse.json({ error: 'Invalid YouTube playlist URL' }, { status: 400 })
    }

    // Fetch YouTube metadata
    const metadata = await fetchPlaylistMetadata(youtube_url)

    if (!metadata) {
      return NextResponse.json(
        { error: 'Failed to fetch YouTube playlist metadata. Please verify the URL is correct and public.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('watch_playlists')
      .insert([
        {
          version_id,
          youtube_url,
          playlist_title: metadata.title,
          playlist_description: metadata.description,
          thumbnail_url: metadata.thumbnail,
          video_count: metadata.videoCount,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }
}
