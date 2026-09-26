-- Migration: Add difficulty column to vocab_words
-- Allows categorizing GRE words into Easy, Medium, and Hard

ALTER TABLE public.vocab_words 
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

CREATE INDEX IF NOT EXISTS idx_vocab_words_difficulty 
ON public.vocab_words(difficulty);
