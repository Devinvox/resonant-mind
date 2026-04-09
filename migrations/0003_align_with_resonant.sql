-- Migration: Align Mind Cloud DB schema with Resonant Mind v3.1.0
-- Context: We upgraded from Mind Cloud → Resonant Mind but the 0001_init.sql
-- was already applied (old Mind Cloud schema). This adds missing columns.

-- 1. observations: add source_date (exists in Resonant Mind upstream schema)
ALTER TABLE observations ADD COLUMN source_date TEXT;

-- 2. observation_versions: rename edited_at → changed_at (Resonant Mind uses changed_at)
ALTER TABLE observation_versions RENAME COLUMN edited_at TO changed_at;
