'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'

interface Video {
  id: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  duration?: string
}

interface Playlist {
  id: string
  youtube_url: string
  playlist_title: string | null
  playlist_description: string | null
  thumbnail_url: string | null
  video_count: number | null
}

interface Version {
  id: string
  version_name: string
  description: string
}

interface Provider {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

export default function VersionPlaylistsPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const providerId = params.providerId as string
  const versionId = params.versionId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [videosByPlaylist, setVideosByPlaylist] = useState<Record<string, Video[]>>({})
  const [loadingVideos, setLoadingVideos] = useState<Record<string, boolean>>({})
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [versionId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setSelectedPlaylist(null)
      setVideosByPlaylist({})
      setLoadingVideos({})

      // Get subject
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subjectId)
        .single()
      setSubject(subjectData)

      // Get provider
      const { data: providerData } = await supabase
        .from('video_providers')
        .select('id, name')
        .eq('id', providerId)
        .single()
      setProvider(providerData)

      // Get version
      const { data: versionData } = await supabase
        .from('provider_versions')
        .select('id, version_name, description')
        .eq('id', versionId)
        .single()
      setVersion(versionData)

      // Get playlists
      const { data: playlistsData } = await supabase
        .from('watch_playlists')
        .select('id, youtube_url, playlist_title, playlist_description, thumbnail_url, video_count')
        .eq('version_id', versionId)
        .order('created_at', { ascending: false })
      setPlaylists(playlistsData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadVideosForPlaylist = async (playlistId: string) => {
    try {
      setLoadingVideos(prev => ({ ...prev, [playlistId]: true }))

      const response = await fetch(`/api/watch-playlists/${playlistId}/videos`)
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }

      const videos = await response.json()
      setVideosByPlaylist(prev => ({
        ...prev,
        [playlistId]: videos,
      }))
    } catch (error) {
      console.error('Error loading videos for playlist:', error)
      toast.error('Failed to load videos for this playlist')
      setVideosByPlaylist(prev => ({
        ...prev,
        [playlistId]: [],
      }))
    } finally {
      setLoadingVideos(prev => ({ ...prev, [playlistId]: false }))
    }
  }

  const handleViewVideos = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist)

    const playlistId = playlist.id

    if (videosByPlaylist[playlistId] || loadingVideos[playlistId]) {
      return
    }

    await loadVideosForPlaylist(playlistId)
  }

  // Natural sort function that handles numeric prefixes
  const naturalSort = (a: Video, b: Video) => {
    const titleA = a.title.trim()
    const titleB = b.title.trim()

    // Extract leading numbers
    const numA = parseInt(titleA.match(/^\d+/)?.[0] || '0')
    const numB = parseInt(titleB.match(/^\d+/)?.[0] || '0')

    // If both have numbers at the start, compare numerically
    if (numA !== 0 && numB !== 0) {
      if (numA !== numB) return numA - numB
      // If numbers are equal, compare the rest of the string
      return titleA.slice(titleA.match(/^\d+/)?.[0].length || 0).localeCompare(titleB.slice(titleB.match(/^\d+/)?.[0].length || 0))
    }

    // If only one has a number, it comes first
    if (numA !== 0) return -1
    if (numB !== 0) return 1

    // Otherwise, use standard string comparison
    return titleA.localeCompare(titleB)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin inline-block mb-4 text-pink-600" />
          <p className="text-pink-600 font-medium">Loading playlists...</p>
        </div>
      </div>
    )
  }

  if (!version) {
    return (
      <div className="text-center py-20">
        <p className="text-pink-600 text-lg">Version not found</p>
        <Button onClick={() => router.back()} className="mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/student/watch" className="text-pink-600 hover:underline font-medium">
          Watch Videos
        </Link>
        <span className="text-pink-300">/</span>
        {subject && (
          <>
            <Link href={`/student/watch/${subject.id}`} className="text-pink-600 hover:underline font-medium">
              {subject.name}
            </Link>
            <span className="text-pink-300">/</span>
          </>
        )}
        {provider && (
          <>
            <Link
              href={`/student/watch/${subjectId}/${provider.id}`}
              className="text-pink-600 hover:underline font-medium"
            >
              {provider.name}
            </Link>
            <span className="text-pink-300">/</span>
          </>
        )}
        <span className="text-pink-600 font-medium">{version.version_name}</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-8 border border-pink-300 shadow-lg">
        <h1 className="text-4xl font-bold text-white">{version.version_name}</h1>
        {version.description && (
          <p className="text-pink-100 mt-3 text-lg">{version.description}</p>
        )}
      </div>

      {/* Playlists */}
      {playlists.length === 0 ? (
        <Card className="border-dashed border-pink-300 bg-pink-50">
          <CardContent className="py-12 text-center text-pink-600">
            <Play className="h-12 w-12 mx-auto mb-3 text-pink-400" />
            <p className="text-lg font-medium">No playlists available</p>
            <p className="text-sm">Check back soon for video content!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {playlists.map(playlist => {
            return (
              <div key={playlist.id} className="space-y-4">
                <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-pink-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {playlist.thumbnail_url && (
                        <img
                          src={playlist.thumbnail_url}
                          alt={playlist.playlist_title || 'YouTube Playlist'}
                          className="h-24 w-40 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-pink-900">{playlist.playlist_title || 'YouTube Playlist'}</h2>
                        {playlist.playlist_description && (
                          <p className="text-pink-700 mt-2 line-clamp-2">{playlist.playlist_description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {playlist.video_count && playlist.video_count > 0 && (
                            <span className="inline-block px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                              {playlist.video_count} videos
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="bg-pink-600 hover:bg-pink-700"
                            onClick={() => handleViewVideos(playlist)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            View Videos
                          </Button>
                          <a href={playlist.youtube_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              <Play className="h-3 w-3 mr-1" />
                              Full Playlist
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Playlist Videos Dialog */}
      <Dialog open={!!selectedPlaylist} onOpenChange={(open) => !open && setSelectedPlaylist(null)}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate text-lg">{selectedPlaylist?.playlist_title || 'YouTube Playlist'}</DialogTitle>
          </DialogHeader>
          {selectedPlaylist && (
            <div className="space-y-4">
              {(loadingVideos[selectedPlaylist.id] || false) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                </div>
              ) : (videosByPlaylist[selectedPlaylist.id] || []).length > 0 ? (
                <div className="space-y-3">
                  {[...(videosByPlaylist[selectedPlaylist.id] || [])]
                    .sort(naturalSort)
                    .map(video => (
                      <button
                        key={video.id}
                        onClick={() => {
                          setSelectedVideo(video)
                          setSelectedPlaylist(null)
                        }}
                        className="group block w-full text-left hover:no-underline"
                      >
                        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-pink-200 hover:border-pink-400 bg-gradient-to-br from-pink-50 to-pink-50 cursor-pointer">
                          <div className="flex gap-4 p-3">
                            <div className="relative flex-shrink-0 w-56 h-32 bg-slate-900 rounded-lg overflow-hidden">
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-700 to-slate-900">
                                  <Play className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="bg-red-600 rounded-full p-3 transform group-hover:scale-110 transition-transform duration-300">
                                  <Play className="h-5 w-5 text-white fill-white" />
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 py-1">
                              <h3 className="font-semibold text-pink-900 line-clamp-2 text-base group-hover:text-pink-600 transition-colors">
                                {video.title}
                              </h3>
                              {video.description && (
                                <p className="text-sm text-pink-700 mt-1">{video.description}</p>
                              )}
                              {video.duration && (
                                <span className="inline-block mt-2 px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                                  {video.duration}
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-pink-500">
                    Videos couldn't be loaded. You can still watch the full playlist using the button on the page.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="truncate text-lg">{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              {/* Embedded YouTube Player */}
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Info */}
              <div className="space-y-3 pt-2">
                <div>
                  <h3 className="text-base font-semibold text-pink-900">{selectedVideo.title}</h3>
                  {selectedVideo.description && (
                    <p className="text-sm text-pink-700 mt-1">{selectedVideo.description}</p>
                  )}
                </div>
                {selectedVideo.duration && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-pink-600">Duration:</span>
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                      {selectedVideo.duration}
                    </span>
                  </div>
                )}
                <a
                  href={selectedVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2"
                >
                  <Button className="bg-red-600 hover:bg-red-700 gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Watch on YouTube
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

