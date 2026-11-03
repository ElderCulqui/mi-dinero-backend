-- Rename the stored balance to an opening balance and add its cut-off date.
-- Existing rows keep their value; the date defaults to the moment of migration.
ALTER TABLE "accounts" RENAME COLUMN "balance" TO "openingBalanceMinor";

ALTER TABLE "accounts"
ADD COLUMN "openingBalanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
