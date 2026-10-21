-- Consolidate both legacy manager roles into the single Preacher role.
-- Recreating the enum removes values that are no longer valid in application code.
ALTER TYPE "Role" RENAME TO "Role_legacy";

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PREACHER');

ALTER TABLE "OrganizationMembership"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
      ELSE 'PREACHER'
    END
  )::"Role";

DROP TYPE "Role_legacy";
