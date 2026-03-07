-- Replace exact-zipcode preference with proper home location + distance preference.
-- Shifts get geocoded coordinates so the matching engine can compute real travel distance.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='employee_preference' AND column_name='preferred_zipcode'
    ) THEN
        ALTER TABLE employee_preference RENAME COLUMN preferred_zipcode TO home_zipcode;
    END IF;
END$$;

ALTER TABLE employee_preference
    ADD COLUMN IF NOT EXISTS home_lat          double precision DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS home_lon          double precision DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS max_distance_miles integer         DEFAULT NULL;

ALTER TABLE shift
    ADD COLUMN IF NOT EXISTS location_lat double precision DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS location_lon double precision DEFAULT NULL;
