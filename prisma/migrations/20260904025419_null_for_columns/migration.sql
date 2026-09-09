-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT "loans_accountId_fkey";

-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT "loans_categoryId_fkey";

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "accountId" DROP NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction_shares" ALTER COLUMN "settlementRate" DROP NOT NULL,
ALTER COLUMN "settlementCurrency" DROP NOT NULL,
ALTER COLUMN "settlementAmount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transfers" ALTER COLUMN "rate" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
