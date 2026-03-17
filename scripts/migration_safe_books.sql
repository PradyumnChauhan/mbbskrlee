-- SMART MIGRATION: Safely add books without losing data
-- This handles both old and new chapter schema

-- Step 1: Check if chapters has subject_id (old schema)
-- If yes, we need to create books and update foreign key

-- Create books table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  edition TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, name)
);

-- Step 2: For EACH SUBJECT, create ONE book without duplicate names
INSERT INTO public.books (subject_id, name, description, edition, created_by, created_at)
SELECT DISTINCT
  s.id,
  s.name,
  s.description,
  '',
  s.created_by,
  s.created_at
FROM public.subjects s
ON CONFLICT (subject_id, name) DO NOTHING;

-- Step 3: If chapters.subject_id exists, update chapters to use book_id
-- This query shows what will happen:
-- SELECT s.id, s.name, c.id as chapter_id, c.chapter_code, b.id as new_book_id
-- FROM chapters c
-- JOIN subjects s ON c.subject_id = s.id  
-- JOIN books b ON b.subject_id = s.id;

-- IMPORTANT: Only run this if chapters.subject_id column exists
-- ALTER TABLE chapters ADD COLUMN book_id UUID REFERENCES public.books(id) ON DELETE CASCADE;
-- UPDATE chapters SET book_id = (SELECT b.id FROM books b WHERE b.subject_id = chapters.subject_id LIMIT 1);
-- ALTER TABLE chapters DROP COLUMN subject_id;

-- Step 4: Verify books were created and associated with chapters
SELECT 
  s.name as subject,
  b.name as book,
  COUNT(c.id) as chapters,
  COUNT(q.id) as questions
FROM public.subjects s
LEFT JOIN public.books b ON b.subject_id = s.id
LEFT JOIN public.chapters c ON c.book_id = b.id
LEFT JOIN public.questions q ON q.chapter_id = c.id
GROUP BY s.id, s.name, b.id, b.name
ORDER BY s.name, b.name;
