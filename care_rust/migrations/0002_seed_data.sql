-- Migration: seed dummy data

INSERT INTO app_user (username, password_hash, role, display_name, img_url, short_bio) VALUES
    ('admin', '$2b$12$KIXGBzqN1dIl9xWJ5b5hCOmQXJ2nB6tWNQv7.5lQ2YkHvGxMzA8lO', 'admin', 'Admin User', NULL, 'System administrator'),
    ('jdoe', '$2b$12$KIXGBzqN1dIl9xWJ5b5hCOmQXJ2nB6tWNQv7.5lQ2YkHvGxMzA8lO', 'user', 'Jane Doe', NULL, 'Care coordinator'),
    ('bsmith', '$2b$12$KIXGBzqN1dIl9xWJ5b5hCOmQXJ2nB6tWNQv7.5lQ2YkHvGxMzA8lO', 'user', 'Bob Smith', NULL, 'Field caregiver')
ON CONFLICT (username) DO NOTHING;

INSERT INTO service (service_name) VALUES
    ('Personal Care'),
    ('Companionship'),
    ('Meal Preparation'),
    ('Transportation'),
    ('Light Housekeeping')
ON CONFLICT DO NOTHING;

INSERT INTO client (first_name, last_name, has_personal_care, has_lifting, address_1, address_2, zipcode, phone_number) VALUES
    ('Alice',   'Johnson', TRUE,  FALSE, '123 Maple St',    '',        '30301', '555-100-0001'),
    ('Robert',  'Williams',FALSE, TRUE,  '456 Oak Ave',     'Apt 2B',  '30302', '555-100-0002'),
    ('Mary',    'Davis',   TRUE,  TRUE,  '789 Pine Rd',     '',        '30303', '555-100-0003'),
    ('Charles', 'Martinez',FALSE, FALSE, '321 Elm Blvd',    'Suite 5', '30304', '555-100-0004'),
    ('Patricia','Anderson', TRUE, FALSE, '654 Cedar Lane',  '',        '30305', '555-100-0005');

INSERT INTO shift (client_id, service_id, total_hours, zipcode, available) VALUES
    (1, 1, 4,  30301, TRUE),
    (1, 5, 2,  30301, FALSE),
    (2, 2, 3,  30302, TRUE),
    (3, 1, 8,  30303, TRUE),
    (3, 3, 2,  30303, FALSE),
    (4, 4, 1,  30304, TRUE),
    (5, 1, 6,  30305, TRUE),
    (5, 2, 4,  30305, FALSE);
