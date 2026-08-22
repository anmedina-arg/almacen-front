-- Phase: Add image_url to categories
-- Run this in the Supabase SQL Editor

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
