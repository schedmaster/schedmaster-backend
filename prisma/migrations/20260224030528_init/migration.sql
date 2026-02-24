/*
  Warnings:

  - You are about to drop the column `dia_semana` on the `horario` table. All the data in the column will be lost.
  - Added the required column `dias_semana` to the `Horario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `horario` DROP COLUMN `dia_semana`,
    ADD COLUMN `dias_semana` VARCHAR(191) NOT NULL;
