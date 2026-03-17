import { NextRequest, NextResponse } from 'next/server'
import { fetchPlaylistVideos } from '@/lib/youtube-utils'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the playlist from database to get youtube_url
    const { data: playlist, error } = await supabase
      .from('watch_playlists')
      .select('youtube_url, playlist_title')
      .eq('id', id)
      .single()

    if (error || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Fetch videos from YouTube using YouTube Data API
    const videos = await fetchPlaylistVideos(playlist.youtube_url, 100)

    // Transform video data to match frontend interface
    const transformedVideos = videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.channel,
      thumbnail: v.thumbnail,
      videoUrl: v.url,
      duration: v.duration ? `${Math.floor(v.duration / 60)}:${(v.duration % 60).toString().padStart(2, '0')}` : undefined,
    }))

    return NextResponse.json(transformedVideos)
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch videos from playlist. Make sure YOUTUBE_API_KEY environment variable is set.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
