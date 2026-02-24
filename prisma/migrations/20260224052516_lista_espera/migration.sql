-- CreateTable
CREATE TABLE `ListaEspera` (
    `id_lista` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(191) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',

    UNIQUE INDEX `ListaEspera_correo_key`(`correo`),
    PRIMARY KEY (`id_lista`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
