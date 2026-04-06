CREATE TABLE `login_challenge_2fa` (
  `id` VARCHAR(191) NOT NULL,
  `id_usuario` INTEGER NOT NULL,
  `code_hash` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `intent` VARCHAR(191) NOT NULL DEFAULT 'login',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `max_attempts` INTEGER NOT NULL DEFAULT 5,
  `consumed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `send_count` INTEGER NOT NULL DEFAULT 1,

  PRIMARY KEY (`id`),
  INDEX `login_challenge_2fa_id_usuario_intent_consumed_at_expires_at_idx` (`id_usuario`, `intent`, `consumed_at`, `expires_at`),
  CONSTRAINT `login_challenge_2fa_id_usuario_fkey`
    FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
