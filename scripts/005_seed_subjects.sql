-- Seed hardcoded subjects if they don't already exist
-- This script should be run after 004_add_watch_tables.sql migration

-- We need a temporary admin user ID - this should be updated with actual admin ID
-- For now, we'll use a placeholder and admin should manually create subjects via UI
-- OR: modify this to use the first admin user from profiles table

-- Insert subjects if they don't exist
INSERT INTO public.subjects (id, name, description, created_by)
SELECT 
  gen_random_uuid(),
  name,
  description,
  (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1)
FROM (VALUES 
  ('Anatomy', 'Study of body structures and systems'),
  ('Physiology', 'Study of how body systems function'),
  ('Biochemistry', 'Study of chemical processes in living organisms')
) AS subjects(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects WHERE name = subjects.name
)
AND EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');

-- If no admin exists, you'll need to manually create subjects after admin signup
-- Or create a special seeding endpoint that creates them during admin setup
