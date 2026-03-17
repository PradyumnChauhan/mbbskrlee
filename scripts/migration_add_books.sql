-- MIGRATION: Convert Subject->Chapter to Subject->Book->Chapter hierarchy
-- This script drops old tables and recreates them with the new schema

-- Step 1: Drop dependent views first
DROP VIEW IF EXISTS public.chapter_progress CASCADE;

-- Step 2: Drop tables that reference chapters
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;

-- Step 3: Drop old chapters table
DROP TABLE IF EXISTS public.chapters CASCADE;

-- Step 4: Create new books table (if not already created)
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

-- Step 5: Create new chapters table with book_id
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_code TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, chapter_code)
);

-- Step 6: Recreate questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'subjective')),
  question_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Recreate student_progress table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attempted', 'correct', 'incorrect', 'skipped')),
  student_answer JSONB,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, question_id)
);

-- Step 8: Recreate bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, question_id)
);

-- Step 9: Recreate chapter_progress view with book info
CREATE OR REPLACE VIEW public.chapter_progress AS
SELECT 
  sp.student_id,
  c.id as chapter_id,
  c.chapter_name,
  b.id as book_id,
  b.name as book_name,
  s.id as subject_id,
  s.name as subject_name,
  COUNT(sp.id) as total_attempted,
  COUNT(CASE WHEN sp.status = 'correct' THEN 1 END) as correct_count,
  ROUND(
    COUNT(CASE WHEN sp.status = 'correct' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(sp.id), 0) * 100, 2
  ) as accuracy_percentage
FROM public.student_progress sp
JOIN public.questions q ON sp.question_id = q.id
JOIN public.chapters c ON q.chapter_id = c.id
JOIN public.books b ON c.book_id = b.id
JOIN public.subjects s ON b.subject_id = s.id
WHERE 
  LOWER(COALESCE(
    q.question_data->>'category',
    q.question_data->>'type',
    q.question_data->>'kind',
    q.question_type,
    'mcq'
  )) = 'mcq'
GROUP BY sp.student_id, c.id, c.chapter_name, b.id, b.name, s.id, s.name;

-- Step 10: Enable RLS on books table
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for books (everyone can read, only admin can write)
CREATE POLICY "books_select_all" ON public.books FOR SELECT USING (TRUE);
CREATE POLICY "books_insert_admin" ON public.books FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "books_update_admin" ON public.books FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "books_delete_admin" ON public.books FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Step 12: Recreate RLS policies for chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_select_all" ON public.chapters FOR SELECT USING (TRUE);
CREATE POLICY "chapters_insert_admin" ON public.chapters FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "chapters_update_admin" ON public.chapters FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "chapters_delete_admin" ON public.chapters FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Step 13: Recreate RLS policies for questions, student_progress, bookmarks
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select_all" ON public.questions FOR SELECT USING (TRUE);
CREATE POLICY "questions_insert_admin" ON public.questions FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "questions_update_admin" ON public.questions FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "questions_delete_admin" ON public.questions FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_progress_select_own" ON public.student_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "student_progress_select_admin" ON public.student_progress FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "student_progress_insert_own" ON public.student_progress FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "student_progress_update_own" ON public.student_progress FOR UPDATE USING (auth.uid() = student_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select_own" ON public.bookmarks FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "bookmarks_select_admin" ON public.bookmarks FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks FOR DELETE USING (auth.uid() = student_id);

-- Step 14: Create indexes
CREATE INDEX IF NOT EXISTS idx_books_subject_id ON public.books(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON public.chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_question_id ON public.student_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_student_id ON public.bookmarks(student_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_question_id ON public.bookmarks(question_id);

-- Migration complete!
-- The schema is now: Subject -> Book -> Chapter -> Question
