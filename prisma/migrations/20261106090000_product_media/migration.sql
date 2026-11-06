-- Product photos and model videos.
-- Additive only: no existing column or row is changed, so current products keep
-- working. Products without media rows fall back to their `images` list.

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `cardMedia` ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN `editorial` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ProductMedia` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `kind` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `url` VARCHAR(1000) NOT NULL,
    `posterUrl` VARCHAR(1000) NULL,
    `alt` VARCHAR(300) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductMedia_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductMedia` ADD CONSTRAINT `ProductMedia_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
