const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');

// CONSTANTES Y CONFIGURACIÓN
const ERROR_MESSAGES = {
  DUPLICATE_EMAIL: 'El correo ya está registrado',
  INVALID_EMAIL: 'El formato del correo no es válido',
  INVALID_DOMAIN: 'Solo se permiten correos institucionales (@uteq.edu.mx)',
  USER_NOT_FOUND: 'Usuario no encontrado',
  WRONG_PASSWORD: 'Contraseña incorrecta',
  PENDING_APPROVAL: 'Tu cuenta está pendiente de aprobación',
  REGISTRATION_SUCCESS: 'Usuario registrado correctamente. En espera de aprobación.',
  LOGIN_SUCCESS: 'Login correcto',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_DOMAIN = '@uteq.edu.mx';

// VALIDATION STRATEGIES (Funciones helper)

/**
 * Normaliza el correo electrónico
 * @param {string} email 
 * @returns {string} Email normalizado
 */
const normalizeEmail = (email) => {
  return email?.trim().toLowerCase() || '';
};

/**
 * Valida el formato del correo electrónico
 * @param {string} email 
 * @returns {boolean}
 */
const isValidEmailFormat = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Verifica si el correo pertenece al dominio permitido
 * @param {string} email 
 * @returns {boolean}
 */
const isAllowedDomain = (email) => {
  return email.endsWith(ALLOWED_DOMAIN);
};

/**
 * Verifica si un correo ya existe en la base de datos
 * @param {PrismaClient} prisma 
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const emailExists = async (prisma, email) => {
  const user = await prisma.usuario.findUnique({
    where: { correo: email },
    select: { id_usuario: true }
  });
  return !!user;
};

/**
 * Valida el correo para registro (formato + duplicados)
 * Strategy Pattern: encapsula la lógica de validación
 * @param {PrismaClient} prisma 
 * @param {string} email 
 * @returns {Promise<Object>}
 */
const validateEmailForRegistration = async (prisma, email) => {
  const normalizedEmail = normalizeEmail(email);
  
  // Validación de formato
  if (!isValidEmailFormat(normalizedEmail)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_EMAIL,
      statusCode: 400
    };
  }
  
  // Validación de dominio institucional
  if (!isAllowedDomain(normalizedEmail)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_DOMAIN,
      statusCode: 400
    };
  }
  
  // Validación de duplicados
  const exists = await emailExists(prisma, normalizedEmail);
  if (exists) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.DUPLICATE_EMAIL,
      statusCode: 400
    };
  }
  
  return {
    isValid: true,
    normalizedEmail
  };
};

// CONTROLLERS

// REGISTER
exports.register = async (req, res) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      password,
      id_carrera,
      id_division,
      cuatrimestre,
      id_rol,
    } = req.body;

    // Validar correo usando Strategy
    const emailValidation = await validateEmailForRegistration(prisma, correo);
    
    if (!emailValidation.isValid) {
      return res.status(emailValidation.statusCode).json({
        message: emailValidation.error,
      });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Transacción Prisma
    await prisma.$transaction(async (tx) => {

      // Insertar usuario con email normalizado
      const user = await tx.usuario.create({
        data: {
          nombre,
          apellido_paterno,
          apellido_materno,
          correo: emailValidation.normalizedEmail,
          contrasena: hashedPassword,
          id_carrera: id_carrera || null,
          id_division: id_division || null,
          cuatrimestre,
          id_rol,
        }
      });

      // Crear inscripción pendiente
      await tx.inscripcion.create({
        data: {
          id_usuario: user.id_usuario,
          fecha_inscripcion: new Date(),
          estado: 'pendiente',
          prioridad: 'normal'
        }
      });

    });

    res.json({
      message: ERROR_MESSAGES.REGISTRATION_SUCCESS,
    });
    
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;
    console.log('PRISMA INSTANCE 👉', prisma);
    // Normalizar email para búsqueda
    const normalizedEmail = normalizeEmail(correo);

    const user = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
      include: {
        inscripciones: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        message: ERROR_MESSAGES.USER_NOT_FOUND 
      });
    }

    const estado = user.inscripciones?.[0]?.estado;

// Roles que requieren aprobación (ejemplo: solo rol 1 y 2)
const ROLES_SIN_APROBACION = [3, 4];

if (!ROLES_SIN_APROBACION.includes(user.id_rol)) {
  if (estado !== 'aprobado') {
    return res.status(403).json({
      message: ERROR_MESSAGES.PENDING_APPROVAL,
    });
  }
}
    const match = await bcrypt.compare(password, user.contrasena);

    if (!match) {
      return res.status(401).json({ 
        message: ERROR_MESSAGES.WRONG_PASSWORD 
      });
    }

    res.json({
      message: ERROR_MESSAGES.LOGIN_SUCCESS,
      usuario: user,
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};