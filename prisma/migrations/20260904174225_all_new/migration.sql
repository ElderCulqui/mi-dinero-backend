/*
  Warnings:

  - You are about to drop the column `accountId` on the `billing_cycles` table. All the data in the column will be lost.
  - Added the required column `creditCardId` to the `billing_cycles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "billing_cycles" DROP CONSTRAINT "billing_cycles_accountId_fkey";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "creditCardId" INTEGER;

-- AlterTable
ALTER TABLE "billing_cycles" DROP COLUMN "accountId",
ADD COLUMN     "creditCardId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "bankCurrency" "Currency",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
