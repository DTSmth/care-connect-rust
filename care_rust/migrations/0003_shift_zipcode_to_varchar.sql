-- Migration: change shift.zipcode from INTEGER to VARCHAR to match client.zipcode
ALTER TABLE shift ALTER COLUMN zipcode TYPE VARCHAR(20) USING zipcode::VARCHAR;
