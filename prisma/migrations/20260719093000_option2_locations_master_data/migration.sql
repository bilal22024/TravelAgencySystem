-- Enable UUID generation for migration backfill rows
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- AlterTable
ALTER TABLE "Agency"
ADD COLUMN "countryId" UUID,
ADD COLUMN "cityId" UUID;

-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_name_key" ON "City"("countryId", "name");

-- CreateIndex
CREATE INDEX "Agency_countryId_idx" ON "Agency"("countryId");

-- CreateIndex
CREATE INDEX "Agency_cityId_idx" ON "Agency"("cityId");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill countries from existing agencies
INSERT INTO "Country" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), source."name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT INITCAP(BTRIM("country")) AS "name"
    FROM "Agency"
    WHERE BTRIM(COALESCE("country", '')) <> ''
) AS source
ON CONFLICT ("name") DO NOTHING;

-- Ensure required operational countries exist
INSERT INTO "Country" ("id", "name", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'Afghanistan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Egypt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Sudan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Saudi Arabia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Pakistan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Backfill cities from existing agencies where a matching country exists
INSERT INTO "City" ("id", "countryId", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), country_match."id", source."cityName", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        INITCAP(BTRIM(a."country")) AS "countryName",
        CASE
            WHEN LOWER(BTRIM(a."city")) IN ('mazar-i-sharif', 'mazar-e-sharif') THEN 'Mazar-e-Sharif'
            ELSE INITCAP(BTRIM(a."city"))
        END AS "cityName"
    FROM "Agency" a
    WHERE BTRIM(COALESCE(a."country", '')) <> ''
      AND BTRIM(COALESCE(a."city", '')) <> ''
) AS source
INNER JOIN "Country" country_match
    ON country_match."name" = source."countryName"
ON CONFLICT ("countryId", "name") DO NOTHING;

-- Ensure required operational cities exist
INSERT INTO "City" ("id", "countryId", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c."id", required_city."name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Country" c
INNER JOIN (
    VALUES
        ('Afghanistan', 'Kabul'),
        ('Afghanistan', 'Kandahar'),
        ('Afghanistan', 'Herat'),
        ('Afghanistan', 'Mazar-e-Sharif'),
        ('Afghanistan', 'Jalalabad'),
        ('Egypt', 'Cairo'),
        ('Sudan', 'Khartoum'),
        ('Saudi Arabia', 'Riyadh'),
        ('Pakistan', 'Islamabad')
) AS required_city("countryName", "name")
    ON required_city."countryName" = c."name"
ON CONFLICT ("countryId", "name") DO NOTHING;

-- Backfill Agency.countryId and Agency.cityId from canonical master data
UPDATE "Agency" a
SET "countryId" = c."id"
FROM "Country" c
WHERE a."countryId" IS NULL
  AND BTRIM(COALESCE(a."country", '')) <> ''
  AND c."name" = INITCAP(BTRIM(a."country"));

UPDATE "Agency" a
SET "cityId" = city_match."id"
FROM "City" city_match
WHERE a."cityId" IS NULL
  AND a."countryId" = city_match."countryId"
  AND BTRIM(COALESCE(a."city", '')) <> ''
  AND city_match."name" = CASE
      WHEN LOWER(BTRIM(a."city")) IN ('mazar-i-sharif', 'mazar-e-sharif') THEN 'Mazar-e-Sharif'
      ELSE INITCAP(BTRIM(a."city"))
  END;

-- Rewrite legacy free-text country/city values to canonical names where a mapping exists
UPDATE "Agency" a
SET "country" = c."name"
FROM "Country" c
WHERE a."countryId" = c."id"
  AND COALESCE(a."country", '') <> c."name";

UPDATE "Agency" a
SET "city" = city_match."name"
FROM "City" city_match
WHERE a."cityId" = city_match."id"
  AND COALESCE(a."city", '') <> city_match."name";
