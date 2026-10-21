CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'OUT_OF_SERVICE');

ALTER TABLE "Customer"
ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "Customer_organizationId_status_deletedAt_idx"
ON "Customer"("organizationId", "status", "deletedAt");
