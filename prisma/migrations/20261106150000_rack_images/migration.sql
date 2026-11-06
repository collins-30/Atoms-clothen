-- Cut-out garment images for the clothing rail. Additive only.

-- AlterTable
ALTER TABLE `ProductMedia` ADD COLUMN `rack` ENUM('FRONT', 'BACK') NULL,
    ADD COLUMN `aspect` DOUBLE NULL;
