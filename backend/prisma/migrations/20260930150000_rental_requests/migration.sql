CREATE TABLE `rental_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `landlord_id` INTEGER NOT NULL,
  `room_id` INTEGER NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `rent_price` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `contract_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `rental_requests_user_id_status_idx` (`user_id`, `status`),
  INDEX `rental_requests_landlord_id_status_idx` (`landlord_id`, `status`),
  INDEX `rental_requests_room_id_status_idx` (`room_id`, `status`),
  CONSTRAINT `rental_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `rental_requests_landlord_id_fkey` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `rental_requests_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
