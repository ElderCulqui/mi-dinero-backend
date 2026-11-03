/*
  Warnings:

  - You are about to alter the column `balance` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `creditLimit` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `bankAmount` on the `billing_cycles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `totalAmount` on the `installment_plans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amountPerInstallment` on the `installment_plans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amount` on the `installments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `paidAmount` on the `installments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amount` on the `loan_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `paidAmount` on the `loan_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `principal` on the `loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `totalAmount` on the `loans` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amount` on the `transaction_shares` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `settlementAmount` on the `transaction_shares` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `amountBase` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `fromAmount` on the `transfers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `toAmount` on the `transfers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE BIGINT,
ALTER COLUMN "creditLimit" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "billing_cycles" ALTER COLUMN "bankAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "installment_plans" ALTER COLUMN "totalAmount" SET DATA TYPE BIGINT,
ALTER COLUMN "amountPerInstallment" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "installments" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "paidAmount" SET DEFAULT 0,
ALTER COLUMN "paidAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "loan_payments" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "paidAmount" SET DEFAULT 0,
ALTER COLUMN "paidAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "principal" SET DATA TYPE BIGINT,
ALTER COLUMN "totalAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "transaction_shares" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "settlementAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "amountBase" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "transfers" ALTER COLUMN "fromAmount" SET DATA TYPE BIGINT,
ALTER COLUMN "toAmount" SET DATA TYPE BIGINT;
