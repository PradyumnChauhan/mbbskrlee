-- DATA MIGRATION: Associate existing chapters with books
-- This script creates a default book for each subject and updates chapters to use it

-- Step 1: For each subject, create a default book if it doesn't exist
INSERT INTO public.books (subject_id, name, description, edition, created_by, created_at)
SELECT 
  s.id,
  s.name || ' - Default Book',
  'Default book containing all chapters for ' || s.name,
  '1st Edition',
  s.created_by,
  NOW()
FROM public.subjects s
WHERE NOT EXISTS (
  SELECT 1 FROM public.books b WHERE b.subject_id = s.id
)
ON CONFLICT (subject_id, name) DO NOTHING;

-- Step 2: Update all chapters to point to the default book for their subject
UPDATE public.chapters c
SET book_id = (
  SELECT b.id 
  FROM public.books b
  WHERE b.subject_id = (
    SELECT subject_id FROM public.chapters WHERE id = c.id LIMIT 1
  )
  LIMIT 1
)
WHERE book_id IS NULL;

-- Step 3: Verify the migration
SELECT 
  s.name as subject_name,
  b.name as book_name,
  b.edition,
  COUNT(c.id) as chapter_count
FROM public.subjects s
LEFT JOIN public.books b ON b.subject_id = s.id
LEFT JOIN public.chapters c ON c.book_id = b.id
GROUP BY s.id, s.name, b.id, b.name, b.edition
ORDER BY s.name, b.name;

-- Data migration complete!
