/*
  Warnings:

  - You are about to drop the column `remember_device` on the `sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "remember_device";
