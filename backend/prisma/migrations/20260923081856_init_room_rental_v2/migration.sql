-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('LANDLORD', 'TENANT', 'ADMIN') NOT NULL DEFAULT 'TENANT',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `refresh_token` TEXT NULL,
    `google_id` VARCHAR(255) NULL,
    `auth_provider` ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL',
    `avatar_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    INDEX `users_google_id_idx`(`google_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `landlord_id` INTEGER NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `floor` INTEGER NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `area` DECIMAL(6, 2) NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rooms_landlord_id_status_idx`(`landlord_id`, `status`),
    UNIQUE INDEX `rooms_landlord_id_room_number_key`(`landlord_id`, `room_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_images_room_id_idx`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `landlord_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `identity_number` VARCHAR(50) NULL,
    `date_of_birth` DATE NULL,
    `address` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tenants_landlord_id_idx`(`landlord_id`),
    INDEX `tenants_user_id_idx`(`user_id`),
    INDEX `tenants_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `landlord_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `rent_price` DECIMAL(12, 2) NOT NULL,
    `deposit` DECIMAL(12, 2) NOT NULL,
    `billing_day` TINYINT NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'PENDING',
    `terms` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contracts_room_id_idx`(`room_id`),
    INDEX `contracts_tenant_id_idx`(`tenant_id`),
    INDEX `contracts_landlord_id_status_idx`(`landlord_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(50) NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `landlord_id` INTEGER NOT NULL,
    `billing_month` VARCHAR(7) NOT NULL,
    `room_rent` DECIMAL(12, 2) NOT NULL,
    `electricity_previous` INTEGER NOT NULL,
    `electricity_current` INTEGER NOT NULL,
    `electricity_usage` INTEGER NOT NULL,
    `electricity_unit_price` DECIMAL(10, 2) NOT NULL,
    `electricity_total` DECIMAL(12, 2) NOT NULL,
    `water_previous` INTEGER NOT NULL,
    `water_current` INTEGER NOT NULL,
    `water_usage` INTEGER NOT NULL,
    `water_unit_price` DECIMAL(10, 2) NOT NULL,
    `water_total` DECIMAL(12, 2) NOT NULL,
    `service_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `other_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `other_fee_note` VARCHAR(255) NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `due_date` DATE NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_contract_id_billing_month_idx`(`contract_id`, `billing_month`),
    INDEX `invoices_landlord_id_status_idx`(`landlord_id`, `status`),
    INDEX `invoices_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `invoices_room_id_idx`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `landlord_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `provider` ENUM('MOCK', 'PAYOS', 'SEPAY', 'CASH', 'BANK_TRANSFER') NOT NULL DEFAULT 'MOCK',
    `transaction_code` VARCHAR(100) NOT NULL,
    `provider_transaction_id` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `payment_method` VARCHAR(50) NULL,
    `paid_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_transaction_code_key`(`transaction_code`),
    INDEX `payments_invoice_id_idx`(`invoice_id`),
    INDEX `payments_landlord_id_status_idx`(`landlord_id`, `status`),
    INDEX `payments_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_images` ADD CONSTRAINT `room_images_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
