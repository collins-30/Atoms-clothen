-- Where the hanger sits on each clothing-rail image. Additive only.

-- AlterTable
ALTER TABLE `ProductMedia` ADD COLUMN `hang` JSON NULL;
