-- CreateTable
CREATE TABLE `Propuesta` (
    `id_propuesta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_inscripcion` INTEGER NOT NULL,
    `id_horario` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
    `fecha_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_respuesta` DATETIME(3) NULL,

    PRIMARY KEY (`id_propuesta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropuestaDia` (
    `id_propuesta_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_propuesta` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    PRIMARY KEY (`id_propuesta_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Propuesta` ADD CONSTRAINT `Propuesta_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Propuesta` ADD CONSTRAINT `Propuesta_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Propuesta` ADD CONSTRAINT `Propuesta_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropuestaDia` ADD CONSTRAINT `PropuestaDia_id_propuesta_fkey` FOREIGN KEY (`id_propuesta`) REFERENCES `Propuesta`(`id_propuesta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropuestaDia` ADD CONSTRAINT `PropuestaDia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;
