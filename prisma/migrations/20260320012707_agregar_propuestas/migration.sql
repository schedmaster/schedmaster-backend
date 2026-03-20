/*
  Warnings:

  - You are about to drop the `propuestadia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `propuesta` DROP FOREIGN KEY `Propuesta_id_horario_fkey`;

-- DropForeignKey
ALTER TABLE `propuesta` DROP FOREIGN KEY `Propuesta_id_inscripcion_fkey`;

-- DropForeignKey
ALTER TABLE `propuesta` DROP FOREIGN KEY `Propuesta_id_usuario_fkey`;

-- DropForeignKey
ALTER TABLE `propuestadia` DROP FOREIGN KEY `PropuestaDia_id_dia_fkey`;

-- DropForeignKey
ALTER TABLE `propuestadia` DROP FOREIGN KEY `PropuestaDia_id_propuesta_fkey`;

-- DropTable
DROP TABLE `propuestadia`;

-- CreateTable
CREATE TABLE `propuesta_dia` (
    `id_propuesta_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_propuesta` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    PRIMARY KEY (`id_propuesta_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `propuesta` ADD CONSTRAINT `propuesta_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propuesta` ADD CONSTRAINT `propuesta_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propuesta` ADD CONSTRAINT `propuesta_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propuesta_dia` ADD CONSTRAINT `propuesta_dia_id_propuesta_fkey` FOREIGN KEY (`id_propuesta`) REFERENCES `propuesta`(`id_propuesta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propuesta_dia` ADD CONSTRAINT `propuesta_dia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;
