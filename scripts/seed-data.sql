-- Seed data for QBank
-- This script adds sample subjects, chapters, and questions for testing

-- Insert sample subjects
INSERT INTO public.subjects (name, description, created_by) VALUES
('Mathematics', 'Core mathematics fundamentals and advanced topics', (SELECT id FROM auth.users LIMIT 1)),
('Physics', 'Physics concepts and problem solving', (SELECT id FROM auth.users LIMIT 1)),
('Chemistry', 'Chemistry principles and reactions', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Get subject IDs
WITH math_subject AS (
  SELECT id FROM public.subjects WHERE name = 'Mathematics' LIMIT 1
),
physics_subject AS (
  SELECT id FROM public.subjects WHERE name = 'Physics' LIMIT 1
),
chemistry_subject AS (
  SELECT id FROM public.subjects WHERE name = 'Chemistry' LIMIT 1
)

-- Insert chapters
INSERT INTO public.chapters (subject_id, chapter_code, chapter_name, description) VALUES
((SELECT id FROM math_subject), 'MATH01', 'Algebra Basics', 'Introduction to algebraic equations'),
((SELECT id FROM math_subject), 'MATH02', 'Geometry', 'Geometric shapes and theorems'),
((SELECT id FROM physics_subject), 'PHYS01', 'Mechanics', 'Newton''s laws and motion'),
((SELECT id FROM chemistry_subject), 'CHEM01', 'Atomic Structure', 'Atoms and electron configuration')
ON CONFLICT DO NOTHING;

-- Insert sample MCQ questions for Algebra Basics
WITH chapter_data AS (
  SELECT id FROM public.chapters WHERE chapter_code = 'MATH01' LIMIT 1
)
INSERT INTO public.questions (chapter_id, question_type, question_data) VALUES
(
  (SELECT id FROM chapter_data),
  'mcq',
  '{
    "text": "What is the solution to the equation 2x + 5 = 13?",
    "type": "mcq",
    "options": ["x = 2", "x = 3", "x = 4", "x = 5"],
    "correctOption": 2,
    "explanation": "2x + 5 = 13; 2x = 8; x = 4"
  }'::jsonb
),
(
  (SELECT id FROM chapter_data),
  'mcq',
  '{
    "text": "Factorize: x² + 5x + 6",
    "type": "mcq",
    "options": ["(x+2)(x+3)", "(x+1)(x+6)", "(x+2)(x+4)", "(x+3)(x+3)"],
    "correctOption": 0,
    "explanation": "x² + 5x + 6 = (x+2)(x+3). Check: (x+2)(x+3) = x² + 3x + 2x + 6 = x² + 5x + 6"
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert sample subjective question for Geometry
WITH chapter_data AS (
  SELECT id FROM public.chapters WHERE chapter_code = 'MATH02' LIMIT 1
)
INSERT INTO public.questions (chapter_id, question_type, question_data) VALUES
(
  (SELECT id FROM chapter_data),
  'subjective',
  '{
    "text": "Prove that the sum of angles in a triangle is 180 degrees.",
    "type": "subjective",
    "explanation": "Draw a line parallel to the base through the opposite vertex. Using alternate interior angles and properties of parallel lines, you can show that the three angles sum to 180 degrees."
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert questions for Physics
WITH chapter_data AS (
  SELECT id FROM public.chapters WHERE chapter_code = 'PHYS01' LIMIT 1
)
INSERT INTO public.questions (chapter_id, question_type, question_data) VALUES
(
  (SELECT id FROM chapter_data),
  'mcq',
  '{
    "text": "What is the SI unit of force?",
    "type": "mcq",
    "options": ["Dyne", "Newton", "Joule", "Watt"],
    "correctOption": 1,
    "explanation": "Newton (N) is the SI unit of force. 1 N = 1 kg·m/s²"
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert questions for Chemistry
WITH chapter_data AS (
  SELECT id FROM public.chapters WHERE chapter_code = 'CHEM01' LIMIT 1
)
INSERT INTO public.questions (chapter_id, question_type, question_data) VALUES
(
  (SELECT id FROM chapter_data),
  'mcq',
  '{
    "text": "What is the electron configuration of Carbon?",
    "type": "mcq",
    "options": ["1s² 2s² 2p¹", "1s² 2s² 2p²", "1s² 2s¹ 2p³", "1s¹ 2s² 2p³"],
    "correctOption": 1,
    "explanation": "Carbon has atomic number 6, so it has 6 electrons: 1s² 2s² 2p²"
  }'::jsonb
)
ON CONFLICT DO NOTHING;
