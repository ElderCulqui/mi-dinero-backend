-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "openingBalanceDate" SET DEFAULT CURRENT_DATE,
ALTER COLUMN "openingBalanceDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "billing_cycles" ALTER COLUMN "periodStart" SET DATA TYPE DATE,
ALTER COLUMN "periodEnd" SET DATA TYPE DATE,
ALTER COLUMN "dueDate" SET DATA TYPE DATE,
ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "statementRegisteredAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "contact_debts" ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "dueDate" SET DATA TYPE DATE,
ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "credit_cards" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Lima';

-- AlterTable
ALTER TABLE "exchange_rates" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "installment_plans" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "firstDueDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "installments" ALTER COLUMN "dueDate" SET DATA TYPE DATE,
ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "loan_payments" ALTER COLUMN "dueDate" SET DATA TYPE DATE,
ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "startDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "transaction_shares" ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Lima';
