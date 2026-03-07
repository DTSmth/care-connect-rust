-- Migration: add assigned_employee_id to shift
-- A shift belongs to one primary employee. The occurrence table tracks calendar
-- instances and can be adjusted per-day as exceptions, but the shift itself
-- records who "owns" this recurring series.

ALTER TABLE shift
    ADD COLUMN assigned_employee_id INTEGER REFERENCES employee(employee_id) ON DELETE SET NULL;
