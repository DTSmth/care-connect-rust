-- Migration: add scheduling fields to shift and create shift_occurrence table

-- Add temporal/recurrence fields to the shift (series) table
ALTER TABLE shift
    ADD COLUMN IF NOT EXISTS default_start_time       TIME,
    ADD COLUMN IF NOT EXISTS default_duration_minutes SMALLINT,
    ADD COLUMN IF NOT EXISTS recurrence_rule          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS series_start             DATE,
    ADD COLUMN IF NOT EXISTS series_end               DATE;

-- Individual calendar instances — the source of truth for the calendar view.
-- Occurrences are eagerly generated when a shift series is created/updated
-- (up to a 90-day horizon) and can be individually overridden.
CREATE TABLE IF NOT EXISTS shift_occurrence (
    occurrence_id   SERIAL PRIMARY KEY,
    shift_id        INTEGER     NOT NULL REFERENCES shift(shift_id) ON DELETE CASCADE,
    employee_id     INTEGER              REFERENCES employee(employee_id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end   TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    notes           TEXT,
    CONSTRAINT chk_occurrence_status CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_occurrence_range
    ON shift_occurrence (scheduled_start, scheduled_end);

CREATE INDEX IF NOT EXISTS idx_occurrence_shift
    ON shift_occurrence (shift_id);

CREATE INDEX IF NOT EXISTS idx_occurrence_employee
    ON shift_occurrence (employee_id);
