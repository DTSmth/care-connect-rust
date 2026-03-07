-- Migration: add unique constraint on shift_occurrence to support ON CONFLICT DO NOTHING
-- during calendar generation, preventing duplicate occurrences when the same window
-- is queried more than once.

-- First remove any duplicates that may have been created before this constraint existed,
-- keeping the lowest occurrence_id for each (shift_id, scheduled_start) pair.
DELETE FROM shift_occurrence
WHERE occurrence_id NOT IN (
    SELECT MIN(occurrence_id)
    FROM shift_occurrence
    GROUP BY shift_id, scheduled_start
);

ALTER TABLE shift_occurrence
    ADD CONSTRAINT uq_occurrence_shift_start UNIQUE (shift_id, scheduled_start);
