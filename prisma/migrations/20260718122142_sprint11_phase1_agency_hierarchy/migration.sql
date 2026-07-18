-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('PARENT', 'BRANCH');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "agencyType" "AgencyType" NOT NULL DEFAULT 'PARENT',
ADD COLUMN     "category" VARCHAR(120),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "parentAgencyId" UUID,
ADD COLUMN     "primaryContactPerson" VARCHAR(120);

-- CreateTable
CREATE TABLE "AgencyPhone" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "label" VARCHAR(60),
    "phoneNumber" VARCHAR(30) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyEmail" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "label" VARCHAR(60),
    "email" VARCHAR(255) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyDocument" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "documentName" VARCHAR(120) NOT NULL,
    "documentType" VARCHAR(60),
    "fileUrl" VARCHAR(500),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyPhone_agencyId_idx" ON "AgencyPhone"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyPhone_agencyId_phoneNumber_key" ON "AgencyPhone"("agencyId", "phoneNumber");

-- CreateIndex
CREATE INDEX "AgencyEmail_agencyId_idx" ON "AgencyEmail"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyEmail_agencyId_email_key" ON "AgencyEmail"("agencyId", "email");

-- CreateIndex
CREATE INDEX "AgencyDocument_agencyId_idx" ON "AgencyDocument"("agencyId");

-- CreateIndex
CREATE INDEX "Agency_agencyType_idx" ON "Agency"("agencyType");

-- CreateIndex
CREATE INDEX "Agency_parentAgencyId_idx" ON "Agency"("parentAgencyId");

-- CreateIndex
CREATE INDEX "Agency_category_idx" ON "Agency"("category");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_parentAgencyId_fkey" FOREIGN KEY ("parentAgencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyPhone" ADD CONSTRAINT "AgencyPhone_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyEmail" ADD CONSTRAINT "AgencyEmail_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyDocument" ADD CONSTRAINT "AgencyDocument_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
