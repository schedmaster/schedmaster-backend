/*
  Warnings:

  - You are about to drop the column `dias_semana` on the `horario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `horario` DROP COLUMN `dias_semana`;

-- AlterTable
ALTER TABLE `inscripcion` MODIFY `fecha_inscripcion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `Dia` (
    `id_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HorarioDia` (
    `id_horario_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_horario` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    UNIQUE INDEX `HorarioDia_id_horario_id_dia_key`(`id_horario`, `id_dia`),
    PRIMARY KEY (`id_horario_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InscripcionDia` (
    `id_inscripcion_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_inscripcion` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    PRIMARY KEY (`id_inscripcion_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HorarioDia` ADD CONSTRAINT `HorarioDia_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorarioDia` ADD CONSTRAINT `HorarioDia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscripcionDia` ADD CONSTRAINT `InscripcionDia_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscripcionDia` ADD CONSTRAINT `InscripcionDia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;
