-- Migration: create employee table, separate from app_user

CREATE TABLE IF NOT EXISTS employee (
    employee_id  SERIAL PRIMARY KEY,
    first_name   VARCHAR(255) NOT NULL,
    last_name    VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20)  NOT NULL,
    email        VARCHAR(255)
);

-- Recreate employee_preference referencing employee instead of app_user
DROP TABLE IF EXISTS employee_preference;

CREATE TABLE employee_preference (
    employee_id          INTEGER PRIMARY KEY REFERENCES employee(employee_id) ON DELETE CASCADE,
    can_do_personal_care BOOLEAN     NOT NULL DEFAULT FALSE,
    can_do_lifting       BOOLEAN     NOT NULL DEFAULT FALSE,
    preferred_zipcode    VARCHAR(20),
    min_hours            SMALLINT,
    max_hours            SMALLINT
);

-- Seed employees
INSERT INTO employee (first_name, last_name, phone_number, email) VALUES
    ('Jane',  'Doe',   '555-200-0001', 'jdoe@careportal.com'),
    ('Bob',   'Smith', '555-200-0002', 'bsmith@careportal.com');

-- Seed their preferences
INSERT INTO employee_preference (employee_id, can_do_personal_care, can_do_lifting, preferred_zipcode, min_hours, max_hours) VALUES
    (1, TRUE,  FALSE, '30301', 2, 6),
    (2, TRUE,  TRUE,  '30303', 4, 8);
