import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPlaylistVideos } from '@/lib/youtube-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('playlistId')

    if (!playlistId) {
      return NextResponse.json({ error: 'Missing playlistId parameter' }, { status: 400 })
    }

    // Get the playlist from database
    const { data: playlist, error } = await supabase
      .from('watch_playlists')
      .select('youtube_url, playlist_title')
      .eq('id', playlistId)
      .single()

    if (error || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Fetch videos from YouTube using yt-dlp
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
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch videos from playlist. Make sure yt-dlp is installed: pip install yt-dlp',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
