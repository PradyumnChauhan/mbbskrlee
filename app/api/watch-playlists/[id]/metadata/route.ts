import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPlaylistMetadata } from '@/lib/youtube-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const { data: playlist, error: playlistError } = await supabase
      .from('watch_playlists')
      .select('id, youtube_url')
      .eq('id', id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const metadata = await fetchPlaylistMetadata(playlist.youtube_url)

    if (!metadata) {
      return NextResponse.json(
        { error: 'Failed to fetch playlist metadata' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('watch_playlists')
      .update({
        playlist_title: metadata.title,
        playlist_description: metadata.description,
        thumbnail_url: metadata.thumbnail,
        video_count: metadata.videoCount,
      })
      .eq('id', id)
      .select('id, youtube_url, playlist_title, playlist_description, thumbnail_url, video_count')
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error refreshing playlist metadata:', error)
    return NextResponse.json({ error: 'Failed to refresh playlist metadata' }, { status: 500 })
  }
}
