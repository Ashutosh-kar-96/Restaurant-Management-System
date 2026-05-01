-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NOT NULL,
    `fromRole` VARCHAR(191) NOT NULL,
    `toRole` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NULL,
    `restaurantId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'MESSAGE',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_toRole_restaurantId_idx`(`toRole`, `restaurantId`),
    INDEX `chat_messages_toRole_branchId_idx`(`toRole`, `branchId`),
    INDEX `chat_messages_fromUserId_idx`(`fromUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
