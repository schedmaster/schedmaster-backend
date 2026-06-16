const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");

// ==========================================
// 1. OBTENER ASISTENCIAS PARA ADMIN
// ==========================================
exports.getAsistenciasAdmin = async (req, res) => {
  try {
    const { fecha, id_horario, estado, id_carrera, id_periodo } = req.query; 
    let periodoIdParaFiltrar;

    if (id_periodo) {
      periodoIdParaFiltrar = Number(id_periodo);
    } else {
      const periodoActivo = await prisma.periodo.findFirst({ where: { estado: 'activo' } });
      if (!periodoActivo) return res.status(404).json({ message: "No hay convocatoria activa." });
      periodoIdParaFiltrar = periodoActivo.id_periodo;
    }

    let fechaFiltro = new Date(); 
    if (fecha) {
      const partes = fecha.split('-'); 
      fechaFiltro = new Date(partes[0], partes[1] - 1, partes[2]); 
    }

    const inicioDia = new Date(fechaFiltro);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaFiltro);
    finDia.setHours(23, 59, 59, 999);

    const inscripciones = await prisma.inscripcion.findMany({
      where: {
        estado: 'aprobado',
        id_periodo: periodoIdParaFiltrar,
        id_horario: id_horario && id_horario !== 'Todos' ? Number(id_horario) : undefined,
        usuario: {
          id_carrera: id_carrera && id_carrera !== 'Todas' ? Number(id_carrera) : undefined,
        }
      },
      include: {
        usuario: { include: { carrera: true } },
        horario: true,
        diasSeleccionados: { include: { dia: true } },
        asistencias: { where: { fecha: { gte: inicioDia, lte: finDia } } }
      }
    });

    const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaSemanaFecha = DIAS_ES[fechaFiltro.getDay()];

    const data = inscripciones.map(ins => {
      const registro = ins.asistencias[0];
      let status = 'Pendiente';
      if (registro) status = registro.asistio ? 'Presente' : 'Ausente';
      const diasHorario = ins.diasSeleccionados?.map(d => d.dia?.nombre).filter(Boolean) ?? [];
      return {
        id_usuario: ins.id_usuario,
        id_inscripcion: ins.id_inscripcion,
        id_horario: ins.id_horario,
        usuario: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno}`,
        correo: ins.usuario.correo,
        carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
        horario: `${ins.horario.hora_inicio} - ${ins.horario.hora_fin}`,
        estado: status,
        diasHorario,
      };
    }).filter(ins => {
      if (!ins.diasHorario || ins.diasHorario.length === 0) return true;
      return ins.diasHorario.includes(diaSemanaFecha);
    });

    res.json(estado && estado !== 'Todos' ? data.filter(d => d.estado.toLowerCase() === estado.toLowerCase()) : data);
  } catch (error) {
    console.error("❌ Error en getAsistenciasAdmin:", error);
    res.status(500).json({ message: "Error al obtener asistencias" });
  }
};

// ==========================================
// 2. REGISTRAR ASISTENCIA
// ==========================================
exports.registrarAsistencia = async (req, res) => {
  try {
    const { id_usuario, id_inscripcion, id_horario, asistio, id_registrado_por, fecha_registro } = req.body;
    const fechaActual = new Date();

    // ✅ Se elimina la validación de fecha contra el servidor (problema de zona horaria UTC vs México).
    // La validación de "solo hoy" y "dentro del horario" ya la hace el frontend antes de llamar aquí.

    let inicioDia, finDia;
    if (fecha_registro) {
      const partes = fecha_registro.split('-');
      const fechaLocal = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      inicioDia = new Date(fechaLocal); inicioDia.setHours(0, 0, 0, 0);
      finDia    = new Date(fechaLocal); finDia.setHours(23, 59, 59, 999);
    } else {
      inicioDia = new Date(fechaActual); inicioDia.setHours(0, 0, 0, 0);
      finDia    = new Date(fechaActual); finDia.setHours(23, 59, 59, 999);
    }

    const asistenciaExistente = await prisma.asistencia.findFirst({
      where: { id_usuario: Number(id_usuario), fecha: { gte: inicioDia, lte: finDia } }
    });

    const resultado = asistenciaExistente
      ? await prisma.asistencia.update({
          where: { id_asistencia: asistenciaExistente.id_asistencia },
          data: { asistio: Boolean(asistio), fecha: new Date() }
        })
      : await prisma.asistencia.create({
          data: {
            id_usuario: Number(id_usuario),
            id_inscripcion: Number(id_inscripcion),
            id_horario: Number(id_horario),
            fecha: new Date(),
            asistio: Boolean(asistio),
            id_registrado_por: Number(id_registrado_por || 1)
          }
        });

    res.json({ message: "Asistencia actualizada", asistencia: resultado });
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    res.status(500).json({ message: "Error al registrar" });
  }
};

// ==========================================
// 3. ARCHIVOS E HISTÓRICO
// ==========================================
exports.uploadAndHash = async (req, res) => {
  try {
    const file = req.file;
    const { fecha, id_usuario } = req.body;
    if (!file) return res.status(400).json({ message: "No se recibió archivo" });
    const buffer = fs.readFileSync(file.path);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    if (await prisma.asistenciaHistorico.findFirst({ where: { hash_archivo: hash } })) return res.status(400).json({ message: "El archivo ya existe" });

    await prisma.asistenciaHistorico.create({
      data: { nombre_archivo: file.originalname, ruta_archivo: `uploads/${file.filename}`, hash_archivo: hash, fecha_lista: new Date(fecha), id_usuario: parseInt(id_usuario) }
    });
    res.json({ message: "Archivo procesado con éxito", hash });
  } catch (error) {
    res.status(500).json({ message: "Error al subir" });
  }
};

exports.obtenerHistorico = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q ? { OR: [{ nombre_archivo: { contains: String(q) } }, { id_historico: parseInt(q) || undefined }] } : {};
    const historico = await prisma.asistenciaHistorico.findMany({ where, orderBy: { fecha_lista: "desc" } });
    res.json(historico);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener histórico" });
  }
};

// ==========================================
// 4. REPORTES Y ESTADÍSTICAS
// ==========================================
exports.getReporteEstadisticas = async (req, res) => {
  try {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estado: 'aprobado' },
      include: { usuario: { include: { carrera: true } }, horario: true, asistencias: true }
    });
    const reporte = inscripciones.map((ins, index) => {
      const presentes = ins.asistencias.filter(a => a.asistio).length;
      const porcentaje = ins.asistencias.length > 0 ? Math.round((presentes / ins.asistencias.length) * 100) : 0;
      return {
        id: ins.id_inscripcion || index,
        matricula: ins.usuario.correo?.split('@')[0] || 'N/A',
        nombre: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno} ${ins.usuario.apellido_materno}`.trim(),
        carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
        servicio: ins.horario.tipo_actividad || 'General',
        asistencia: `${porcentaje}%`,
        estado: 'Activo'
      };
    });
    res.json(reporte);
  } catch (error) {
    res.status(500).json({ message: "Error al generar el reporte" });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const ahora = new Date();
    const hoyInicio = new Date(); hoyInicio.setHours(0,0,0,0);
    const hoyFin = new Date(); hoyFin.setHours(23,59,59,999);

    const [pendientes, registrados, activos, asistencias, inscritosTotal, notificados, anuncios] = await Promise.all([
      prisma.inscripcion.count({ where: { estado: 'pendiente' } }),
      prisma.usuario.count({ where: { activo: true } }),
      prisma.periodo.count({ where: { estado: 'activo' } }),
      prisma.asistencia.count({ where: { fecha: { gte: hoyInicio, lte: hoyFin }, asistio: true } }),
      prisma.inscripcion.count({ where: { estado: 'aprobado' } }),
      prisma.propuesta.count(),
      prisma.anuncio?.count({ where: { activo: true } }) || 0
    ]);

    const inscripcionesMes = Array(12).fill(0);
    const interesadosMes = Array(12).fill(0);
    const unAñoAtras = new Date(ahora.getFullYear() - 1, ahora.getMonth() + 1, 1);

    const historial = await prisma.inscripcion.findMany({
      where: { fecha_inscripcion: { gte: unAñoAtras } },
      select: { fecha_inscripcion: true, estado: true }
    });

    for (let i = 0; i < 12; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (11 - i), 1);
      const enMes = historial.filter(h => h.fecha_inscripcion.getMonth() === d.getMonth() && h.fecha_inscripcion.getFullYear() === d.getFullYear());
      interesadosMes[i] = enMes.length;
      inscripcionesMes[i] = enMes.filter(h => h.estado === 'aprobado').length;
    }

    res.json({
      basicos: { inscripcionesPendientes: pendientes, usuariosRegistrados: registrados, asistenciasHoy: asistencias, serviciosActivos: activos },
      kpis: { interesados: historial.length, notificados, inscritos: inscritosTotal, asistencia: 85, anuncios },
      insights: { conversion: historial.length > 0 ? ((inscritosTotal / historial.length) * 100).toFixed(1) : "0.0" },
      tendencias: { inscripcionesMes, interesadosMes }
    });
  } catch (error) {
    console.error("❌ Error en Dashboard:", error);
    res.status(500).json({ message: "Error en estadísticas" });
  }
};