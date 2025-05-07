-- AlterTable
ALTER TABLE `User` ADD COLUMN `subscriptionExpires` DATETIME(3) NULL,
    ADD COLUMN `subscriptionTier` VARCHAR(191) NULL;
