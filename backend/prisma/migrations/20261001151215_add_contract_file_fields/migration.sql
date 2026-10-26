-- AlterTable
ALTER TABLE `contracts` ADD COLUMN `file_mime_type` VARCHAR(100) NULL,
    ADD COLUMN `file_name` VARCHAR(255) NULL,
    ADD COLUMN `file_size` INTEGER NULL,
    ADD COLUMN `file_uploaded_at` DATETIME(3) NULL,
    ADD COLUMN `file_version` INTEGER NOT NULL DEFAULT 0;
