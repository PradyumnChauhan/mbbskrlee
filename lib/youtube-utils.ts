import axios from 'axios'

export interface YoutubePlaylistMetadata {
  title: string
  description: string
  thumbnail: string
  videoCount: number
  playlistId: string
}

export interface YoutubeVideo {
  id: string
  title: string
  url: string
  thumbnail: string
  duration: number | null
  channel: string
}

/**
 * Extract YouTube playlist ID from various URL formats
 * Supports:
 * - https://www.youtube.com/playlist?list=PLxxx
 * - https://youtube.com/playlist?list=PLxxx
 * - PLxxx (just the ID)
 */
export function extractPlaylistId(url: string): string | null {
  // If it's just the ID
  if (url.startsWith('PL') && url.length > 20) {
    return url
  }

  // Try to extract from URL
  try {
    const urlObj = new URL(url)
    const listParam = urlObj.searchParams.get('list')
    if (listParam && listParam.startsWith('PL')) {
      return listParam
    }
  } catch {
    // Not a valid URL
  }

  return null
}

/**
 * Fetch YouTube playlist metadata using YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 */
export async function fetchPlaylistMetadata(youtubeUrl: string): Promise<YoutubePlaylistMetadata | null> {
  try {
    const playlistId = extractPlaylistId(youtubeUrl)

    if (!playlistId) {
      console.error('Invalid YouTube playlist URL:', youtubeUrl)
      return null
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      console.warn('YOUTUBE_API_KEY not set. Returning basic metadata without API data.')
      return {
        title: 'YouTube Playlist',
        description: youtubeUrl,
        thumbnail: '',
        videoCount: 0,
        playlistId,
      }
    }

    // Fetch playlist details
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: {
        part: 'snippet,contentDetails',
        id: playlistId,
        key: apiKey,
      },
    })

    const playlist = playlistResponse.data.items?.[0]

    if (!playlist) {
      console.error('Playlist not found:', playlistId)
      return null
    }

    const snippet = playlist.snippet
    const contentDetails = playlist.contentDetails

    return {
      title: snippet.title || 'Untitled Playlist',
      description: snippet.description || '',
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      videoCount: contentDetails?.itemCount || 0,
      playlistId,
    }
  } catch (error) {
    console.error('Error fetching YouTube playlist metadata:', error)
    return null
  }
}

/**
 * Validate YouTube playlist URL format
 */
export function isValidYoutubePlaylistUrl(url: string): boolean {
  const playlistId = extractPlaylistId(url)
  return playlistId !== null
}

/**
 * Fetch videos from a YouTube playlist using YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 */
export async function fetchPlaylistVideos(youtubeUrl: string, maxVideos?: number): Promise<YoutubeVideo[]> {
  try {
    const playlistId = extractPlaylistId(youtubeUrl)

    if (!playlistId) {
      console.error('Invalid YouTube playlist URL:', youtubeUrl)
      return []
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      console.warn('YOUTUBE_API_KEY not set. Cannot fetch playlist videos.')
      return []
    }

    const videos: YoutubeVideo[] = []
    let nextPageToken: string | undefined = undefined
    let pageCount = 0
    const maxPages = Math.ceil((maxVideos || 100) / 50) // Dynamic page count based on max videos

    do {
      try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
          params: {
            part: 'snippet,contentDetails',
            playlistId,
            maxResults: 50,
            pageToken: nextPageToken,
            key: apiKey,
          },
        })

        const items = response.data.items || []

        items.forEach((item: any) => {
          const videoId = item.contentDetails?.videoId
          const snippet = item.snippet

          if (videoId && snippet) {
            videos.push({
              id: videoId,
              title: snippet.title || 'Untitled',
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail:
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                snippet.thumbnails?.default?.url ||
                '',
              duration: null, // Will be fetched separately if needed
              channel: snippet.channelTitle || 'Unknown',
            })

            // Stop if we've reached the max videos
            if (videos.length >= (maxVideos || 100)) {
              return
            }
          }
        })

        // Stop if we've reached the max videos
        if (videos.length >= (maxVideos || 100)) {
          break
        }

        nextPageToken = response.data.nextPageToken
        pageCount++
      } catch (error) {
        console.error('Error fetching playlist page:', error)
        break
      }
    } while (nextPageToken && pageCount < maxPages)

    // Trim to max videos if needed
    return videos.slice(0, maxVideos || 100)
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    return []
  }
}
