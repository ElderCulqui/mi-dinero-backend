/*
  Warnings:

  - You are about to drop the column `accountId` on the `installment_plans` table. All the data in the column will be lost.
  - Added the required column `creditCardId` to the `installment_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `loans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "installment_plans" DROP COLUMN "accountId",
ADD COLUMN     "creditCardId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
