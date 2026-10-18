-- AlterTable
ALTER TABLE `KolProfile` ADD COLUMN `experienceYears` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `skills` VARCHAR(1000) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `Job` ADD COLUMN `benefits` VARCHAR(5000) NOT NULL DEFAULT '',
    ADD COLUMN `capacity` INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN `recruitmentVersion` INTEGER NOT NULL DEFAULT 0;

-- Preserve confirmed participants when adding capacity to existing jobs.
UPDATE `Job` AS j
INNER JOIN (SELECT `jobId`, COUNT(*) AS confirmed FROM `Participation` GROUP BY `jobId`) AS p ON p.`jobId` = j.`id`
SET j.`capacity` = GREATEST(j.`capacity`, p.confirmed);

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` VARCHAR(2000) NOT NULL,
    `href` VARCHAR(500) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
