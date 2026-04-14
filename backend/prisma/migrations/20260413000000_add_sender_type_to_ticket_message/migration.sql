-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('AGENT', 'CUSTOMER');

-- AlterTable
ALTER TABLE "ticket_message" ADD COLUMN     "senderType" "SenderType" NOT NULL DEFAULT 'CUSTOMER';
