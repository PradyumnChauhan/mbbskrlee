-- ============================================================================
-- SQL DEBUG QUERIES FOR BOOK PAGE QUESTION COUNT ISSUE
-- ============================================================================

-- 1. VIEW ALL TABLES IN THE DATABASE
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. CHECK CHAPTERS TABLE STRUCTURE
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chapters'
ORDER BY ordinal_position;

-- 3. CHECK QUESTIONS TABLE STRUCTURE
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- 4. COUNT TOTAL QUESTIONS IN DATABASE
SELECT COUNT(*) as total_questions FROM questions;

-- 5. VIEW ALL CHAPTERS WITH ROW COUNTS
SELECT 
  c.id,
  c.chapter_code,
  c.chapter_name,
  c.book_id,
  COUNT(q.id) as question_count
FROM chapters c
LEFT JOIN questions q ON c.id = q.chapter_id
GROUP BY c.id, c.chapter_code, c.chapter_name, c.book_id
ORDER BY c.chapter_code;

-- 6. VIEW QUESTION TYPES (RAW DATA - FIRST 10)
SELECT 
  id,
  chapter_id,
  question_type,
  question_data::text as question_data_raw
FROM questions
LIMIT 10;

-- 7. VIEW QUESTION DATA STRUCTURE (FIRST 5 QUESTIONS)
SELECT 
  id,
  chapter_id,
  question_type,
  question_data->>'kind' as json_kind,
  question_data->>'category' as json_category,
  question_data->>'type' as json_type,
  question_data->>'options' as json_options,
  question_data->>'text' as json_text,
  question_data::text as full_json
FROM questions
LIMIT 5;

-- 8. COUNT QUESTIONS BY DETECTED TYPE (based on question_data structure)
SELECT 
  CASE
    WHEN question_data->>'kind' = 'mcq' OR question_data->>'category' = 'mcq' OR question_data->>'type' = 'mcq' OR question_type = 'mcq' THEN 'mcq'
    WHEN question_data->>'kind' ILIKE '%short%note%' OR question_data->>'category' ILIKE '%short%note%' THEN 'short_note'
    WHEN question_data->>'kind' ILIKE '%long%essay%' OR question_data->>'category' ILIKE '%long%essay%' THEN 'long_essay'
    WHEN question_data->>'kind' ILIKE '%short%essay%' OR question_data->>'category' ILIKE '%short%essay%' THEN 'short_essay'
    WHEN question_data->>'type' = 'subjective' THEN 'short_essay'
    ELSE 'unknown: ' || COALESCE(question_data->>'kind', question_data->>'type', question_type, 'NULL')
  END as detected_type,
  COUNT(*) as count
FROM questions
GROUP BY detected_type
ORDER BY count DESC;

-- 9. VIEW ALL QUESTIONS WITHOUT A TYPE (potential issue)
SELECT 
  id,
  chapter_id,
  question_type,
  question_data->>'kind' as kind,
  question_data->>'category' as category,
  question_data->>'type' as type,
  CASE 
    WHEN question_data ? 'options' THEN 'HAS_OPTIONS (MCQ)'
    ELSE 'NO_OPTIONS (Essay)'
  END as has_options
FROM questions
WHERE (question_data->>'kind' IS NULL OR question_data->>'kind' = '')
  AND (question_data->>'category' IS NULL OR question_data->>'category' = '')
  AND (question_data->>'type' IS NULL OR question_data->>'type' = '')
  AND (question_type IS NULL OR question_type = '')
LIMIT 20;

-- 10. VIEW QUESTIONS FOR A SPECIFIC CHAPTER (Replace UUID)
SELECT 
  q.id,
  q.chapter_id,
  q.question_type,
  q.question_data->>'kind' as kind,
  q.question_data->>'category' as category,
  q.question_data->>'type' as type,
  c.chapter_code,
  c.chapter_name
FROM questions q
JOIN chapters c ON q.chapter_id = c.id
WHERE c.id = 'YOUR_CHAPTER_UUID_HERE'
ORDER BY q.created_at;

-- 11. VIEW BOOKS TABLE
SELECT * FROM books LIMIT 5;

-- 12. VIEW SUBJECTS TABLE
SELECT * FROM subjects LIMIT 5;
