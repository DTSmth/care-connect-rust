-- Make capability flags nullable so NULL means "no preference set" (no filter applied),
-- true means "can do" (hard include + scoring bonus), false means "explicitly cannot" (hard exclude).
-- Previously NOT NULL DEFAULT FALSE made "unset" indistinguishable from "explicitly can't".

ALTER TABLE employee_preference
    ALTER COLUMN can_do_personal_care DROP NOT NULL,
    ALTER COLUMN can_do_personal_care DROP DEFAULT,
    ALTER COLUMN can_do_lifting DROP NOT NULL,
    ALTER COLUMN can_do_lifting DROP DEFAULT;

-- Rows that still have the old defaults with no other preferences set are "unset" — clear them.
UPDATE employee_preference
SET can_do_personal_care = NULL,
    can_do_lifting        = NULL
WHERE can_do_personal_care = false
  AND can_do_lifting        = false
  AND preferred_zipcode IS NULL
  AND min_hours IS NULL
  AND max_hours IS NULL;
