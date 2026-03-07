-- CreateTable
CREATE TABLE `AsistenciaHistorico` (
    `id_historico` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_archivo` VARCHAR(191) NOT NULL,
    `ruta_archivo` VARCHAR(191) NOT NULL,
    `hash_archivo` VARCHAR(191) NOT NULL,
    `fecha_lista` DATETIME(3) NOT NULL,
    `anio` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_subida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AsistenciaHistorico_hash_archivo_key`(`hash_archivo`),
    PRIMARY KEY (`id_historico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AsistenciaHistorico` ADD CONSTRAINT `AsistenciaHistorico_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
