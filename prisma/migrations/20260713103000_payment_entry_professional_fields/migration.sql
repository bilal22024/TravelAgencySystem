ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

ALTER TABLE "Payment"
ADD COLUMN "receiptNumber" VARCHAR(40),
ADD COLUMN "paymentCity" VARCHAR(120);

DROP INDEX "Payment_agencyId_reference_key";

CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
