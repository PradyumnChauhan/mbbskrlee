'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  playlists?: Playlist[]
}

interface Provider {
  id: string
  name: string
  description: string
  versions?: Version[]
}

interface Subject {
  id: string
  name: string
  description: string
  providers?: Provider[]
}

export default function AdminWatchPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([])
  const [expandedProviders, setExpandedProviders] = useState<string[]>([])
  const [expandedVersions, setExpandedVersions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [openProviderDialogs, setOpenProviderDialogs] = useState<Record<string, boolean>>({})
  const [openVersionDialogs, setOpenVersionDialogs] = useState<Record<string, boolean>>({})
  const [openPlaylistDialogs, setOpenPlaylistDialogs] = useState<Record<string, boolean>>({})

  // Form states
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' })
  const [providerForm, setProviderForm] = useState({ name: '', description: '' })
  const [versionForm, setVersionForm] = useState({ version_name: '', description: '' })
  const [playlistForm, setPlaylistForm] = useState({ youtube_url: '' })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, description')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
      toast.error('Failed to load subjects')
    } finally {
      setIsLoading(false)
    }
  }

  const loadProviders = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_providers')
        .select('id, name, description')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubjects(subjects.map(s =>
        s.id === subjectId ? { ...s, providers: data || [] } : s
      ))
    } catch (error) {
      console.error('Failed to load providers:', error)
      toast.error('Failed to load providers')
    }
  }

  const loadVersions = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_versions')
        .select('id, version_name, description')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubjects(subjects.map(subject => ({
        ...subject,
        providers: subject.providers?.map(provider =>
          provider.id === providerId ? { ...provider, versions: data || [] } : provider
        ) || [],
      })))
    } catch (error) {
      console.error('Failed to load versions:', error)
      toast.error('Failed to load versions')
    }
  }

  const loadPlaylists = async (versionId: string) => {
    try {
      const { data, error } = await supabase
        .from('watch_playlists')
        .select('id, youtube_url, playlist_title, playlist_description, thumbnail_url, video_count')
        .eq('version_id', versionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      let playlistsData = data || []
      const missingMetadata = playlistsData.filter(
        playlist => !playlist.playlist_title || !playlist.playlist_title.trim()
      )

      if (missingMetadata.length > 0) {
        const refreshed = await Promise.all(
          missingMetadata.map(async (playlist) => {
            try {
              const response = await fetch(`/api/watch-playlists/${playlist.id}/metadata`, {
                method: 'POST',
              })

              if (!response.ok) {
                return null
              }

              return await response.json()
            } catch {
              return null
            }
          })
        )

        const refreshedById = Object.fromEntries(
          refreshed
            .filter((item): item is Playlist => !!item?.id)
            .map(item => [item.id, item])
        )

        playlistsData = playlistsData.map(playlist => refreshedById[playlist.id] || playlist)
      }

      setSubjects(subjects.map(subject => ({
        ...subject,
        providers: subject.providers?.map(provider => ({
          ...provider,
          versions: provider.versions?.map(version =>
            version.id === versionId ? { ...version, playlists: playlistsData } : version
          ) || [],
        })) || [],
      })))
    } catch (error) {
      console.error('Failed to load playlists:', error)
      toast.error('Failed to load playlists')
    }
  }

  const toggleSubjectExpand = async (subjectId: string) => {
    const isExpanded = expandedSubjects.includes(subjectId)
    if (!isExpanded) {
      await loadProviders(subjectId)
    }
    setExpandedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const toggleProviderExpand = async (providerId: string) => {
    const isExpanded = expandedProviders.includes(providerId)
    if (!isExpanded) {
      await loadVersions(providerId)
    }
    setExpandedProviders(prev =>
      prev.includes(providerId) ? prev.filter(id => id !== providerId) : [...prev, providerId]
    )
  }

  const toggleVersionExpand = async (versionId: string) => {
    const isExpanded = expandedVersions.includes(versionId)
    if (!isExpanded) {
      await loadPlaylists(versionId)
    }
    setExpandedVersions(prev =>
      prev.includes(versionId) ? prev.filter(id => id !== versionId) : [...prev, versionId]
    )
  }

  // CRUD Operations
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectForm.name.trim()) {
      toast.error('Subject name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('subjects')
        .insert([{ name: subjectForm.name, description: subjectForm.description, created_by: user?.id }])

      if (error) throw error

      toast.success('Subject created successfully')
      setSubjectForm({ name: '', description: '' })
      setIsSubjectDialogOpen(false)
      await loadSubjects()
    } catch (error) {
      console.error('Error creating subject:', error)
      toast.error('Failed to create subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure? This will delete all providers, versions, and playlists under this subject.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)

      if (error) throw error

      toast.success('Subject deleted successfully')
      await loadSubjects()
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject')
    }
  }

  const handleCreateProvider = async (e: React.FormEvent, subjectId: string) => {
    e.preventDefault()
    if (!providerForm.name.trim()) {
      toast.error('Provider name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('video_providers')
        .insert([{
          subject_id: subjectId,
          name: providerForm.name,
          description: providerForm.description,
        }])

      if (error) {
        if (error.code === '23505') {
          toast.error('Provider already exists for this subject')
        } else {
          throw error
        }
      } else {
        toast.success('Provider created successfully')
        setProviderForm({ name: '', description: '' })
        setOpenProviderDialogs(prev => ({ ...prev, [subjectId]: false }))
        await loadProviders(subjectId)
      }
    } catch (error) {
      console.error('Error creating provider:', error)
      toast.error('Failed to create provider')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure? This will delete all versions and playlists under this provider.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('video_providers')
        .delete()
        .eq('id', providerId)

      if (error) throw error

      toast.success('Provider deleted successfully')
      const subject = subjects.find(s => s.providers?.some(p => p.id === providerId))
      if (subject) {
        await loadProviders(subject.id)
      }
    } catch (error) {
      console.error('Error deleting provider:', error)
      toast.error('Failed to delete provider')
    }
  }

  const handleCreateVersion = async (e: React.FormEvent, providerId: string) => {
    e.preventDefault()
    if (!versionForm.version_name.trim()) {
      toast.error('Version name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('provider_versions')
        .insert([{
          provider_id: providerId,
          version_name: versionForm.version_name,
          description: versionForm.description,
        }])

      if (error) {
        if (error.code === '23505') {
          toast.error('Version already exists for this provider')
        } else {
          throw error
        }
      } else {
        toast.success('Version created successfully')
        setVersionForm({ version_name: '', description: '' })
        setOpenVersionDialogs(prev => ({ ...prev, [providerId]: false }))
        await loadVersions(providerId)
      }
    } catch (error) {
      console.error('Error creating version:', error)
      toast.error('Failed to create version')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Are you sure? This will delete all playlists under this version.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('provider_versions')
        .delete()
        .eq('id', versionId)

      if (error) throw error

      toast.success('Version deleted successfully')

      // Find and reload
      for (const subject of subjects) {
        for (const provider of subject.providers || []) {
          if (provider.versions?.some(v => v.id === versionId)) {
            await loadVersions(provider.id)
            return
          }
        }
      }
    } catch (error) {
      console.error('Error deleting version:', error)
      toast.error('Failed to delete version')
    }
  }

  const handleCreatePlaylist = async (e: React.FormEvent, versionId: string) => {
    e.preventDefault()
    if (!playlistForm.youtube_url.trim()) {
      toast.error('YouTube playlist URL is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/watch-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_id: versionId,
          youtube_url: playlistForm.youtube_url,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to add playlist')
      }

      toast.success('Playlist added successfully')
      setPlaylistForm({ youtube_url: '' })
      setOpenPlaylistDialogs(prev => ({ ...prev, [versionId]: false }))
      await loadPlaylists(versionId)
    } catch (error) {
      console.error('Error creating playlist:', error)
      if ((error as any)?.message?.includes('Invalid YouTube')) {
        toast.error('Invalid YouTube playlist URL')
      } else {
        toast.error('Failed to add playlist. Make sure the URL is correct and the playlist is public.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('watch_playlists')
        .delete()
        .eq('id', playlistId)

      if (error) throw error

      toast.success('Playlist deleted successfully')

      // Reload
      for (const subject of subjects) {
        for (const provider of subject.providers || []) {
          for (const version of provider.versions || []) {
            if (version.playlists?.some(p => p.id === playlistId)) {
              await loadPlaylists(version.id)
              return
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
      toast.error('Failed to delete playlist')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin inline-block mb-4 text-blue-600" />
          <p className="text-blue-600 font-medium">Loading watch management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 border border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Watch Management</h1>
            <p className="text-blue-100 mt-3 text-lg">
              Manage subjects, providers, versions, and YouTube playlists
            </p>
          </div>
          <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                New Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subject</DialogTitle>
                <DialogDescription>Add a new subject (e.g., Anatomy, Physiology, Biochemistry)</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Input
                    id="subject-name"
                    value={subjectForm.name}
                    onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g., Anatomy"
                  />
                </div>
                <div>
                  <Label htmlFor="subject-desc">Description</Label>
                  <Textarea
                    id="subject-desc"
                    value={subjectForm.description}
                    onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    placeholder="Subject description..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Subject
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-slate-500">
              <p>No subjects yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          subjects.map(subject => (
            <Card key={subject.id} className="overflow-hidden">
              <div className="border-b border-blue-200">
                <div className="flex items-center justify-between p-4 hover:bg-blue-50 cursor-pointer"
                  onClick={() => toggleSubjectExpand(subject.id)}>
                  <div className="flex items-center gap-3 flex-1">
                    {expandedSubjects.includes(subject.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <div>
                      <p className="font-semibold text-blue-900">{subject.name}</p>
                      {subject.description && <p className="text-sm text-blue-500">{subject.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {expandedSubjects.includes(subject.id) && (
                      <Dialog open={openProviderDialogs[subject.id] || false} onOpenChange={open => {
                        setOpenProviderDialogs(prev => ({ ...prev, [subject.id]: open }))
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Provider
                          </Button>
                        </DialogTrigger>
                        <DialogContent onClick={e => e.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle>Create New Provider</DialogTitle>
                            <DialogDescription>Add a provider under "{subject.name}" (e.g., Marrow, Prepladder)</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault()
                            handleCreateProvider(e, subject.id)
                          }} className="space-y-4">
                            <div>
                              <Label htmlFor="provider-name">Provider Name</Label>
                              <Input
                                id="provider-name"
                                value={providerForm.name}
                                onChange={e => setProviderForm({ ...providerForm, name: e.target.value })}
                                placeholder="e.g., Marrow"
                              />
                            </div>
                            <div>
                              <Label htmlFor="provider-desc">Description</Label>
                              <Textarea
                                id="provider-desc"
                                value={providerForm.description}
                                onChange={e => setProviderForm({ ...providerForm, description: e.target.value })}
                                placeholder="Provider description..."
                                className="resize-none"
                                rows={3}
                              />
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                              Create Provider
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button size="sm" variant="destructive" onClick={e => {
                      e.stopPropagation()
                      handleDeleteSubject(subject.id)
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Providers List */}
              {expandedSubjects.includes(subject.id) && (
                <div className="bg-blue-50 space-y-0">
                  {subject.providers && subject.providers.length > 0 ? (
                    subject.providers.map((provider, idx) => (
                      <div key={provider.id} className={idx > 0 ? 'border-t border-blue-200' : ''}>
                        <div
                          className="flex items-center justify-between p-4 ml-6 hover:bg-blue-100 cursor-pointer"
                          onClick={() => toggleProviderExpand(provider.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {expandedProviders.includes(provider.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div>
                              <p className="font-medium text-blue-800">{provider.name}</p>
                              {provider.description && <p className="text-xs text-blue-500">{provider.description}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {expandedProviders.includes(provider.id) && (
                              <Dialog open={openVersionDialogs[provider.id] || false} onOpenChange={open => {
                                setOpenVersionDialogs(prev => ({ ...prev, [provider.id]: open }))
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Version
                                  </Button>
                                </DialogTrigger>
                                <DialogContent onClick={e => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle>Create New Version</DialogTitle>
                                    <DialogDescription>Add a version under "{provider.name}" (e.g., Version 8, Version 6.5)</DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={(e) => {
                                    e.preventDefault()
                                    handleCreateVersion(e, provider.id)
                                  }} className="space-y-4">
                                    <div>
                                      <Label htmlFor="version-name">Version Name</Label>
                                      <Input
                                        id="version-name"
                                        value={versionForm.version_name}
                                        onChange={e => setVersionForm({ ...versionForm, version_name: e.target.value })}
                                        placeholder="e.g., Version 8"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="version-desc">Description</Label>
                                      <Textarea
                                        id="version-desc"
                                        value={versionForm.description}
                                        onChange={e => setVersionForm({ ...versionForm, description: e.target.value })}
                                        placeholder="Version description..."
                                        className="resize-none"
                                        rows={3}
                                      />
                                    </div>
                                    <Button type="submit" disabled={isSubmitting} className="w-full">
                                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                      Create Version
                                    </Button>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button size="sm" variant="destructive" onClick={e => {
                              e.stopPropagation()
                              handleDeleteProvider(provider.id)
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Versions List */}
                        {expandedProviders.includes(provider.id) && (
                          <div className="bg-white space-y-0">
                            {provider.versions && provider.versions.length > 0 ? (
                              provider.versions.map((version, vIdx) => (
                                <div key={version.id} className={vIdx > 0 ? 'border-t border-blue-100' : 'border-t border-blue-100'}>
                                  <div
                                    className="flex items-center justify-between p-4 ml-12 hover:bg-blue-50 cursor-pointer"
                                    onClick={() => toggleVersionExpand(version.id)}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      {expandedVersions.includes(version.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <div>
                                        <p className="text-sm font-medium text-blue-700">{version.version_name}</p>
                                        {version.description && <p className="text-xs text-blue-500">{version.description}</p>}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {expandedVersions.includes(version.id) && (
                                        <Dialog open={openPlaylistDialogs[version.id] || false} onOpenChange={open => {
                                          setOpenPlaylistDialogs(prev => ({ ...prev, [version.id]: open }))
                                        }}>
                                          <DialogTrigger asChild>
                                            <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                                              <Plus className="h-3 w-3 mr-1" />
                                              Add Playlist
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent onClick={e => e.stopPropagation()}>
                                            <DialogHeader>
                                              <DialogTitle>Add YouTube Playlist</DialogTitle>
                                              <DialogDescription>Paste a YouTube playlist URL to add it to "{version.version_name}"</DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={(e) => {
                                              e.preventDefault()
                                              handleCreatePlaylist(e, version.id)
                                            }} className="space-y-4">
                                              <div>
                                                <Label htmlFor="playlist-url">YouTube Playlist URL</Label>
                                                <Input
                                                  id="playlist-url"
                                                  value={playlistForm.youtube_url}
                                                  onChange={e => setPlaylistForm({ youtube_url: e.target.value })}
                                                  placeholder="https://www.youtube.com/playlist?list=PLxxxxxx"
                                                />
                                                <p className="text-xs text-blue-500 mt-1">
                                                  Share the public YouTube playlist link. Metadata will be fetched automatically.
                                                </p>
                                              </div>
                                              <Button type="submit" disabled={isSubmitting} className="w-full">
                                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                Add Playlist
                                              </Button>
                                            </form>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                      <Button size="sm" variant="destructive" onClick={e => {
                                        e.stopPropagation()
                                        handleDeleteVersion(version.id)
                                      }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Playlists List */}
                                  {expandedVersions.includes(version.id) && (
                                    <div className="bg-blue-50 space-y-0 border-t border-blue-100">
                                      {version.playlists && version.playlists.length > 0 ? (
                                        version.playlists.map((playlist, pIdx) => (
                                          <div key={playlist.id} className={pIdx > 0 ? 'border-t border-blue-100' : ''}>
                                            <div className="flex items-center justify-between p-4 ml-18 hover:bg-blue-100">
                                              <div className="flex items-center gap-3 flex-1">
                                                {playlist.thumbnail_url && (
                                                  <img
                                                    src={playlist.thumbnail_url}
                                                    alt={playlist.playlist_title}
                                                    className="h-12 w-20 rounded object-cover"
                                                  />
                                                )}
                                                <div className="flex-1">
                                                  <p className="text-sm font-medium text-blue-800">{playlist.playlist_title || 'YouTube Playlist'}</p>
                                                  {playlist.video_count && playlist.video_count > 0 && (
                                                    <p className="text-xs text-blue-500">{playlist.video_count} videos</p>
                                                  )}
                                                </div>
                                              </div>
                                              <Button size="sm" variant="destructive" onClick={e => {
                                                e.stopPropagation()
                                                handleDeletePlaylist(playlist.id)
                                              }}>
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="p-4 ml-18 text-center text-sm text-blue-500">
                                          No playlists yet
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-4 ml-12 text-center text-sm text-blue-500">
                                No versions yet
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 ml-6 text-center text-sm text-blue-500">
                      No providers yet
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
