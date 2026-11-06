-- Background videos for banners, and "night shot" photos/videos for Night Mode.
-- Additive only: existing banners and media are unchanged.

-- AlterTable
ALTER TABLE `Banner` ADD COLUMN `videoUrl` VARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE `ProductMedia` ADD COLUMN `night` BOOLEAN NOT NULL DEFAULT false;
