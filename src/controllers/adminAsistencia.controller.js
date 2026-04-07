const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");

/* ==========================
   1. OBTENER DATOS PARA LA TABLA DE MONITOREO
========================== */
exports.getAsistenciasAdmin = async (req, res) => {
  try {
    const { fecha, id_horario, estado, id_carrera } = req.query;
    
    //CORRECCIÓN ZONA HORARIA: Manejo explícito de la fecha para evitar desfases
    let fechaFiltro = new Date(); // Si no hay fecha, usa HOY con la hora local actual
    
    if (fecha) {
      // Si mandan '2026-03-24', lo partimos para crear una fecha local exacta sin UTC shift
      const partes = fecha.split('-'); 
      fechaFiltro = new Date(partes[0], partes[1] - 1, partes[2]); 
    }

    // Creamos los límites de ESE día específico (desde las 00:00:00 hasta las 23:59:59)
    const inicioDia = new Date(fechaFiltro);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fechaFiltro);
    finDia.setHours(23, 59, 59, 999);

    const inscripciones = await prisma.inscripcion.findMany({
      where: {
        estado: 'aprobado',
        id_horario: id_horario && id_horario !== 'Todos' ? Number(id_horario) : undefined,
        usuario: {
          id_carrera: id_carrera && id_carrera !== 'Todas' ? Number(id_carrera) : undefined,
        }
      },
      include: {
        usuario: { include: { carrera: true } },
        horario: true,
        asistencias: {
          where: { fecha: { gte: inicioDia, lte: finDia } }
        }
      }
    });

    const data = inscripciones.map(ins => {
      const registro = ins.asistencias[0];
      let status = 'Pendiente';
      if (registro) {
        status = registro.asistio ? 'Presente' : 'Ausente';
      }

      return {
        id_usuario: ins.id_usuario,
        id_inscripcion: ins.id_inscripcion,
        id_horario: ins.id_horario,
        usuario: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno}`,
        correo: ins.usuario.correo,
        carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
        horario: `${ins.horario.hora_inicio} - ${ins.horario.hora_fin}`,
        estado: status
      };
    });

    const finalData = estado && estado !== 'Todos' 
      ? data.filter(d => d.estado.toLowerCase() === estado.toLowerCase())
      : data;

    res.json(finalData);
  } catch (error) {
    console.error("❌ Error en getAsistenciasAdmin:", error);
    res.status(500).json({ message: "Error al obtener asistencias" });
  }
};

/* ==========================
   2. REGISTRAR ASISTENCIA (EL BOTÓN DE LA TABLA)
========================== */
exports.registrarAsistencia = async (req, res) => {
  try {
    const { id_usuario, id_inscripcion, id_horario, asistio, id_registrado_por, fecha_registro } = req.body;

    // Usamos la fecha que mande el frontend (si está viendo un día pasado), o usamos HOY
    let fechaAfectar = new Date();
    if (fecha_registro) {
      const partes = fecha_registro.split('-');
      fechaAfectar = new Date(partes[0], partes[1] - 1, partes[2]);
    }

    const inicioDia = new Date(fechaAfectar);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fechaAfectar);
    finDia.setHours(23, 59, 59, 999);

    // Verificamos si ya existe una asistencia para ESE DÍA ESPECÍFICO
    const asistenciaExistente = await prisma.asistencia.findFirst({
      where: {
        id_usuario: Number(id_usuario),
        fecha: { gte: inicioDia, lte: finDia }
      }
    });

    let resultado;
    
    // Si estamos modificando una asistencia que ya se tomó hoy (o el día seleccionado)
    if (asistenciaExistente) {
      resultado = await prisma.asistencia.update({
        where: { id_asistencia: asistenciaExistente.id_asistencia },
        // Actualizamos el estado, pero usamos la hora local exacta para que no se desfase
        data: { asistio: Boolean(asistio), fecha: new Date() } 
      });
    } else {
      // Es un registro nuevo para ese día
      resultado = await prisma.asistencia.create({
        data: {
          id_usuario: Number(id_usuario),
          id_inscripcion: Number(id_inscripcion),
          id_horario: Number(id_horario),
          fecha: new Date(), // Guardamos el timestamp exacto del momento del clic
          asistio: Boolean(asistio),
          id_registrado_por: Number(id_registrado_por || 1)
        }
      });
    }

    res.json({ message: "Asistencia actualizada", asistencia: resultado });
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    res.status(500).json({ message: "Error al registrar" });
  }
};

/* ==========================
   3. SUBIR ARCHIVO Y GENERAR HASH 
========================== */
exports.uploadAndHash = async (req, res) => {
  try {
    const file = req.file;
    const { fecha, id_usuario } = req.body;

    if (!file) return res.status(400).json({ message: "No se recibió archivo" });

    const buffer = fs.readFileSync(file.path);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    const existente = await prisma.asistenciaHistorico.findFirst({
      where: { hash_archivo: hash }
    });

    if (existente) return res.status(400).json({ message: "El archivo ya existe" });

    await prisma.asistenciaHistorico.create({
      data: {
        nombre_archivo: file.originalname,
        ruta_archivo: `uploads/${file.filename}`,
        hash_archivo: hash,
        fecha_lista: new Date(fecha),
        id_usuario: parseInt(id_usuario)
      }
    });

    res.json({ message: "Archivo procesado con éxito", hash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al subir" });
  }
};

/* ==========================
   4. OBTENER HISTÓRICO
========================== */
exports.obtenerHistorico = async (req, res) => {
  try {
    const { q } = req.query;

    const where = {};

    if (q && String(q).trim() !== '') {
      const textoBusqueda = String(q).trim();
      const posibleId = parseInt(textoBusqueda, 10);

      where.OR = [
        { nombre_archivo: { contains: textoBusqueda } }
      ];

      if (!Number.isNaN(posibleId)) {
        where.OR.push({ id_historico: posibleId });
      }
    }

    const historico = await prisma.asistenciaHistorico.findMany({
      where,
      orderBy: { fecha_lista: "desc" }
    });
    res.json(historico);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener histórico" });
  }
};

/* ==========================
   5. GENERAR REPORTE COMPLETO DE ESTADÍSTICAS
========================== */
exports.getReporteEstadisticas = async (req, res) => {
  try {
    // Buscamos todas las inscripciones aprobadas y traemos la data del usuario, carrera, horario y asistencias
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estado: 'aprobado' },
      include: {
        usuario: {
          include: { carrera: true }
        },
        horario: true,
        asistencias: true
      }
    });

    const reporte = inscripciones.map((ins, index) => {
      // 1. Calculamos el total de asistencias en las que se le dio clic a "Presente" o "Ausente"
      const totalAsistencias = ins.asistencias.length;
      
      // 2. Calculamos cuántas de esas fueron "Presente"
      const asistenciasPresente = ins.asistencias.filter(a => a.asistio).length;
      
      // 3. Regla de 3 para el porcentaje
      const porcentaje = totalAsistencias > 0 
        ? Math.round((asistenciasPresente / totalAsistencias) * 100) 
        : 0;

      // Extraer matrícula del correo (por si su correo es 202171004@uteq.edu.mx)
      const matriculaExtraida = ins.usuario.correo ? ins.usuario.correo.split('@')[0] : 'N/A';

      return {
        id: ins.id_inscripcion || index, // Por si acaso
        matricula: matriculaExtraida,
        nombre: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno} ${ins.usuario.apellido_materno}`.trim(),
        carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
        servicio: ins.horario.tipo_actividad || 'General',
        asistencia: `${porcentaje}%`,
        estado: ins.estado === 'aprobado' ? 'Activo' : 'Inactivo'
      };
    });

    res.json(reporte);
  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    res.status(500).json({ message: "Error al generar el reporte" });
  }
};

/* ==========================
   6. OBTENER STATS PRINCIPALES PARA EL DASHBOARD
========================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const inscripcionesPendientes = await prisma.inscripcion.count({ where: { estado: 'pendiente' } });
    const usuariosRegistrados = await prisma.usuario.count({ where: { activo: true } });

    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));
    const asistenciasHoy = await prisma.asistencia.count({
      where: { fecha: { gte: inicioDia, lte: finDia }, asistio: true }
    });

    const serviciosActivos = await prisma.periodo.count({ where: { estado: 'activo' } });

    // 👈 NUEVO: Traer las últimas 5 inscripciones pendientes para la tabla rápida
    const ultimasPendientesRaw = await prisma.inscripcion.findMany({
      where: { estado: 'pendiente' },
      orderBy: { fecha_inscripcion: 'desc' },
      take: 5, // Solo traemos 5 para no saturar el Dashboard
      include: {
        usuario: { include: { carrera: true } },
        horario: true
      }
    });

    // Formateamos los datos para que el Frontend los lea fácil
    const ultimasPendientes = ultimasPendientesRaw.map(ins => ({
      id: ins.id_inscripcion,
      nombre: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno}`,
      carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
      servicio: ins.horario.tipo_actividad || 'General',
      fecha: ins.fecha_inscripcion
    }));

    res.json({
      inscripcionesPendientes,
      usuariosRegistrados,
      asistenciasHoy,
      serviciosActivos,
      ultimasPendientes // 👈 Lo agregamos a la respuesta
    });
  } catch (error) {
    console.error("❌ Error obteniendo stats del dashboard:", error);
    res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
  }
};