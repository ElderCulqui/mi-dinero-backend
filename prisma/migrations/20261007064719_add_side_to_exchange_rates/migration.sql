-- CreateEnum
CREATE TYPE "RateSide" AS ENUM ('buy', 'sell');

-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "side" "RateSide" NOT NULL DEFAULT 'sell';
