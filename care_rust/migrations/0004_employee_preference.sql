-- Migration: employee preferences for shift matching

CREATE TABLE IF NOT EXISTS employee_preference (
    user_id              INTEGER PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    can_do_personal_care BOOLEAN      NOT NULL DEFAULT FALSE,
    can_do_lifting       BOOLEAN      NOT NULL DEFAULT FALSE,
    preferred_zipcode    VARCHAR(20),
    min_hours            SMALLINT,
    max_hours            SMALLINT
);

-- Seed preferences for dummy users
INSERT INTO employee_preference (user_id, can_do_personal_care, can_do_lifting, preferred_zipcode, min_hours, max_hours)
SELECT user_id, TRUE,  FALSE, '30301', 2, 6 FROM app_user WHERE username = 'jdoe'
ON CONFLICT DO NOTHING;

INSERT INTO employee_preference (user_id, can_do_personal_care, can_do_lifting, preferred_zipcode, min_hours, max_hours)
SELECT user_id, TRUE,  TRUE,  '30303', 4, 8 FROM app_user WHERE username = 'bsmith'
ON CONFLICT DO NOTHING;
