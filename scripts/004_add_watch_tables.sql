-- Create video_providers table (under each subject, e.g., Marrow, Prepladder)
CREATE TABLE IF NOT EXISTS public.video_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, name)
);

-- Create provider_versions table (under each provider, e.g., Version 8, Version 6.5)
CREATE TABLE IF NOT EXISTS public.provider_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.video_providers(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, version_name)
);

-- Create watch_playlists table (YouTube playlists for each version)
CREATE TABLE IF NOT EXISTS public.watch_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.provider_versions(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  playlist_title TEXT,
  playlist_description TEXT,
  thumbnail_url TEXT,
  video_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.video_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_providers (everyone can read, only admin can write)
CREATE POLICY "video_providers_select_all" ON public.video_providers FOR SELECT USING (TRUE);
CREATE POLICY "video_providers_insert_admin" ON public.video_providers FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "video_providers_update_admin" ON public.video_providers FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "video_providers_delete_admin" ON public.video_providers FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for provider_versions (everyone can read, only admin can write)
CREATE POLICY "provider_versions_select_all" ON public.provider_versions FOR SELECT USING (TRUE);
CREATE POLICY "provider_versions_insert_admin" ON public.provider_versions FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "provider_versions_update_admin" ON public.provider_versions FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "provider_versions_delete_admin" ON public.provider_versions FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for watch_playlists (everyone can read, only admin can write)
CREATE POLICY "watch_playlists_select_all" ON public.watch_playlists FOR SELECT USING (TRUE);
CREATE POLICY "watch_playlists_insert_admin" ON public.watch_playlists FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "watch_playlists_update_admin" ON public.watch_playlists FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "watch_playlists_delete_admin" ON public.watch_playlists FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
