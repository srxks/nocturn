-- Migration: Update vocab_words_difficulty_check constraint to accept both TitleCase and lowercase
-- Allows: 'Easy', 'easy', 'Medium', 'medium', 'Hard', 'hard'

ALTER TABLE public.vocab_words 
DROP CONSTRAINT IF EXISTS vocab_words_difficulty_check;

ALTER TABLE public.vocab_words 
ADD CONSTRAINT vocab_words_difficulty_check 
CHECK (LOWER(difficulty) IN ('easy', 'medium', 'hard'));
