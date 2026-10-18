-- AlterTable
ALTER TABLE `Job` ADD COLUMN `completedAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('OPEN', 'CLOSED', 'ARCHIVED', 'COMPLETED') NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE `Invitation` MODIFY `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `Participation` ADD COLUMN `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `leftAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('CONFIRMED', 'WITHDRAWAL_PENDING', 'WITHDRAWAL_REJECTED', 'WITHDRAWN_APPROVED', 'WITHDRAWN_UNAPPROVED') NOT NULL DEFAULT 'CONFIRMED';

-- CreateTable
CREATE TABLE `ApplicationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL,
    `message` VARCHAR(2000) NOT NULL,
    `action` VARCHAR(30) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationHistory_applicationId_occurredAt_idx`(`applicationId`, `occurredAt`),
    INDEX `ApplicationHistory_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WithdrawalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `participationId` VARCHAR(191) NOT NULL,
    `activeSlot` VARCHAR(191) NULL,
    `reason` VARCHAR(2000) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'LEFT_WITHOUT_APPROVAL') NOT NULL DEFAULT 'PENDING',
    `timing` ENUM('BEFORE_EVENT', 'WITHIN_24H', 'EVENT_STARTED') NOT NULL,
    `eventDateAtRequest` DATETIME(3) NOT NULL,
    `sourceAtRequest` VARCHAR(191) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `decisionNote` VARCHAR(2000) NOT NULL DEFAULT '',
    `departedAt` DATETIME(3) NULL,

    UNIQUE INDEX `WithdrawalRequest_activeSlot_key`(`activeSlot`),
    INDEX `WithdrawalRequest_participationId_requestedAt_idx`(`participationId`, `requestedAt`),
    INDEX `WithdrawalRequest_status_requestedAt_idx`(`status`, `requestedAt`),
    INDEX `WithdrawalRequest_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Participation_jobId_status_idx` ON `Participation`(`jobId`, `status`);

-- CreateIndex
CREATE INDEX `Participation_kolId_status_idx` ON `Participation`(`kolId`, `status`);

-- AddForeignKey
ALTER TABLE `ApplicationHistory` ADD CONSTRAINT `ApplicationHistory_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationHistory` ADD CONSTRAINT `ApplicationHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRequest` ADD CONSTRAINT `WithdrawalRequest_participationId_fkey` FOREIGN KEY (`participationId`) REFERENCES `Participation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRequest` ADD CONSTRAINT `WithdrawalRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep the first confirmation timestamp of existing participation records.
UPDATE `Participation` SET `confirmedAt` = `createdAt`;

-- Snapshot existing application state; no historic actor/time is invented.
INSERT INTO `ApplicationHistory` (`id`, `applicationId`, `actorId`, `status`, `message`, `action`, `occurredAt`)
SELECT CONCAT('snapshot-', SHA2(`id`, 256)), `id`, NULL, `status`, LEFT(`message`, 2000), 'SNAPSHOT', CURRENT_TIMESTAMP(3) FROM `Application`;
