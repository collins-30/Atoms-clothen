-- CreateTable
CREATE TABLE `RateLimit` (
    `bucket` VARCHAR(191) NOT NULL,
    `hits` INTEGER NOT NULL DEFAULT 0,
    `resetAt` DATETIME(3) NOT NULL,

    INDEX `RateLimit_resetAt_idx`(`resetAt`),
    PRIMARY KEY (`bucket`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
