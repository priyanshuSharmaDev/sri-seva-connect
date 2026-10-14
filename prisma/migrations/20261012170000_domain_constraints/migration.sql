ALTER TABLE "Occasion"
  ADD CONSTRAINT "Occasion_valid_month_day_check"
  CHECK (
    ("month" IN (1, 3, 5, 7, 8, 10, 12) AND "day" BETWEEN 1 AND 31) OR
    ("month" IN (4, 6, 9, 11) AND "day" BETWEEN 1 AND 30) OR
    ("month" = 2 AND "day" BETWEEN 1 AND 29)
  );

ALTER TABLE "Occasion"
  ADD CONSTRAINT "Occasion_valid_year_check"
  CHECK ("year" IS NULL OR "year" BETWEEN 1800 AND 2200);

ALTER TABLE "FamilyMember"
  ADD CONSTRAINT "FamilyMember_custom_relationship_check"
  CHECK (
    "relationship" <> 'CUSTOM' OR
    ("customRelationship" IS NOT NULL AND length(trim("customRelationship")) > 0)
  );

ALTER TABLE "OccasionReminderRule"
  ADD CONSTRAINT "OccasionReminderRule_nonnegative_offset_check"
  CHECK ("offsetMinutes" >= 0);

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_nonnegative_offset_check"
  CHECK ("offsetMinutes" >= 0);
