-- Add student verification support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin accounts should always be considered verified
UPDATE public.profiles
SET is_verified = TRUE
WHERE role = 'admin';

-- Allow admins to verify/unverify student profiles
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
