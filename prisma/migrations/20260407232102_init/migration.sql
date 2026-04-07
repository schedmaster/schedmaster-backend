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
CREATE TABLE `ListaEspera` (
    `id_lista` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(191) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',

    UNIQUE INDEX `ListaEspera_correo_key`(`correo`),
    PRIMARY KEY (`id_lista`)
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

    INDEX `login_challenge_2fa_id_usuario_intent_consumed_at_expires_at_idx`(`id_usuario`, `intent`, `consumed_at`, `expires_at`),
    PRIMARY KEY (`id`)
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
    `hora_inicio` VARCHAR(191) NOT NULL,
    `hora_fin` VARCHAR(191) NOT NULL,
    `tipo_actividad` VARCHAR(191) NULL,
    `capacidad_maxima` INTEGER NOT NULL,

    PRIMARY KEY (`id_horario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `Inscripcion` (
    `id_inscripcion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_horario` INTEGER NOT NULL,
    `id_periodo` INTEGER NOT NULL,
    `fecha_inscripcion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` VARCHAR(191) NOT NULL,
    `prioridad` VARCHAR(191) NOT NULL,
    `id_aprobador` INTEGER NULL,
    `fecha_decision` DATETIME(3) NULL,

    PRIMARY KEY (`id_inscripcion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InscripcionDia` (
    `id_inscripcion_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_inscripcion` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    PRIMARY KEY (`id_inscripcion_dia`)
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

-- CreateTable
CREATE TABLE `AsistenciaHistorico` (
    `id_historico` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_archivo` VARCHAR(191) NOT NULL,
    `ruta_archivo` VARCHAR(191) NOT NULL,
    `hash_archivo` VARCHAR(191) NOT NULL,
    `fecha_lista` DATETIME(3) NOT NULL,
    `fecha_subida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario` INTEGER NOT NULL,

    UNIQUE INDEX `AsistenciaHistorico_hash_archivo_key`(`hash_archivo`),
    PRIMARY KEY (`id_historico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `propuesta` (
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
CREATE TABLE `propuesta_dia` (
    `id_propuesta_dia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_propuesta` INTEGER NOT NULL,
    `id_dia` INTEGER NOT NULL,

    PRIMARY KEY (`id_propuesta_dia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anuncio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `prioridad` VARCHAR(191) NOT NULL,
    `fotografia` VARCHAR(191) NULL,
    `fecha_publicacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BitacoraEntrada` (
    `id_entrada` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `autor_nombre` VARCHAR(191) NOT NULL,
    `texto` TEXT NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_entrada`)
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
ALTER TABLE `login_challenge_2fa` ADD CONSTRAINT `login_challenge_2fa_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Periodo` ADD CONSTRAINT `Periodo_id_entrenador_fkey` FOREIGN KEY (`id_entrenador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_id_periodo_fkey` FOREIGN KEY (`id_periodo`) REFERENCES `Periodo`(`id_periodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorarioDia` ADD CONSTRAINT `HorarioDia_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HorarioDia` ADD CONSTRAINT `HorarioDia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_periodo_fkey` FOREIGN KEY (`id_periodo`) REFERENCES `Periodo`(`id_periodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_id_aprobador_fkey` FOREIGN KEY (`id_aprobador`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscripcionDia` ADD CONSTRAINT `InscripcionDia_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscripcionDia` ADD CONSTRAINT `InscripcionDia_id_dia_fkey` FOREIGN KEY (`id_dia`) REFERENCES `Dia`(`id_dia`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_registrado_por_fkey` FOREIGN KEY (`id_registrado_por`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_inscripcion_fkey` FOREIGN KEY (`id_inscripcion`) REFERENCES `Inscripcion`(`id_inscripcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asistencia` ADD CONSTRAINT `Asistencia_id_horario_fkey` FOREIGN KEY (`id_horario`) REFERENCES `Horario`(`id_horario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsistenciaHistorico` ADD CONSTRAINT `AsistenciaHistorico_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `BitacoraEntrada` ADD CONSTRAINT `BitacoraEntrada_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
