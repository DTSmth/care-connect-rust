-- Add available_days as a text array to store day abbreviations matching the
-- recurrence_rule format: MON, TUE, WED, THU, FRI, SAT, SUN.
-- NULL means no day preference (show all shifts). Empty array is treated the same.

ALTER TABLE employee_preference
    ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT NULL;
