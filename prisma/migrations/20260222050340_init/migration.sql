-- CreateTable
CREATE TABLE `Rol` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_rol` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Division` (
    `id_division` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_division` VARCHAR(191) NOT NULL,
    `siglas` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_division`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Carrera` (
    `id_carrera` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_carrera` VARCHAR(191) NOT NULL,
    `modalidad` VARCHAR(191) NULL,
    `id_division` INTEGER NOT NULL,

    PRIMARY KEY (`id_carrera`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido_paterno` VARCHAR(191) NOT NULL,
    `apellido_materno` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `contrasena` VARCHAR(191) NOT NULL,
    `id_carrera` INTEGER NULL,
    `id_division` INTEGER NULL,
    `cuatrimestre` INTEGER NOT NULL DEFAULT 1,
    `id_rol` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Usuario_correo_key`(`correo`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Periodo` (
    `id_periodo` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_periodo` VARCHAR(191) NOT NULL,
    `fecha_inicio_inscripcion` DATETIME(3) NOT NULL,
    `fecha_fin_inscripcion` DATETIME(3) NOT NULL,
    `fecha_inicio_actividades` DATETIME(3) NOT NULL,
    `fecha_fin_periodo` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `id_entrenador` INTEGER NOT NULL,

    PRIMARY KEY (`id_periodo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Horario` (
    `id_horario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_periodo` INTEGER NOT NULL,
    `dia_semana` VARCHAR(191) NOT NULL,
    `hora_inicio` DATETIME(3) NOT NULL,
    `hora_fin` DATETIME(3) NOT NULL,
    `tipo_actividad` VARCHAR(191) NULL,
    `capacidad_maxima` INTEGER NOT NULL,

    PRIMARY KEY (`id_horario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inscripcion` (
    `id_inscripcion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_horario` INTEGER NOT NULL,
    `id_periodo` INTEGER NOT NULL,
    `fecha_inscripcion` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `prioridad` VARCHAR(191) NOT NULL,
    `id_aprobador` INTEGER NULL,
    `fecha_decision` DATETIME(3) NULL,

    PRIMARY KEY (`id_inscripcion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asistencia` (
    `id_asistencia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_inscripcion` INTEGER NOT NULL,
    `id_horario` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `asistio` BOOLEAN NOT NULL,
    `id_registrado_por` INTEGER NOT NULL,

    PRIMARY KEY (`id_asistencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Carrera` ADD CONSTRAINT `Carrera_id_division_fkey` FOREIGN KEY (`id_division`) REFERENCES `Division`(`id_division`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `Rol`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_id_carrera_fkey` FOREIGN KEY (`id_carrera`) REFERENCES `Carrera`(`id_carrera`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_id_division_fkey` FOREIGN KEY (`id_division`) REFERENCES `Division`(`id_division`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Periodo` ADD CONSTRAINT `Periodo_id_entrenador_fkey` FOREIGN KEY (`id_entrenador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_id_periodo_fkey` FOREIGN KEY (`id_periodo`) REFERENCES `Periodo`(`id_periodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_periodo_fkey` FOREIGN KEY (`id_periodo`) REFERENCES `Periodo`(`id_periodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_aprobador_fkey` FOREIGN KEY (`id_aprobador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_registrado_por_fkey` FOREIGN KEY (`id_registrado_por`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;
