-- Add certainty and short_name fields to identity table for beliefs support
ALTER TABLE identity ADD COLUMN certainty TEXT DEFAULT 'believed';
ALTER TABLE identity ADD COLUMN short_name TEXT DEFAULT '';
