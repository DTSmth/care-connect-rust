-- Migration: clarify the two status systems
--
-- 1. Rename shift.available → open_for_matching
--    This makes clear it only controls the matching engine, not operational status.
--
-- 2. Simplify occurrence statuses to 3: open | confirmed | cancelled
--    - 'scheduled' was identical in meaning to 'open' — rename it
--    - 'completed' was redundant with 'confirmed' for coordinator workflows — merge up

-- Rename column
ALTER TABLE shift RENAME COLUMN available TO open_for_matching;

-- Drop old constraint first, then migrate data, then add new constraint
ALTER TABLE shift_occurrence DROP CONSTRAINT chk_occurrence_status;

UPDATE shift_occurrence SET status = 'open'      WHERE status = 'scheduled';
UPDATE shift_occurrence SET status = 'confirmed' WHERE status = 'completed';

ALTER TABLE shift_occurrence
    ADD CONSTRAINT chk_occurrence_status
    CHECK (status IN ('open', 'confirmed', 'cancelled'));
