DROP INDEX "Group_agencyId_code_key";

CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");
