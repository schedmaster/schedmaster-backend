const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");


exports.getAsistenciasAdmin = async (req, res) => {
  try {
    const { fecha, id_horario, estado, id_carrera } = req.query;

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
        id_horario: id_horario && id_horario !== 'Todos' ? Number(id_horario) : undefined,
        usuario: {
          id_carrera: id_carrera && id_carrera !== 'Todas' ? Number(id_carrera) : undefined,
        }
      },
      include: {
        usuario: { include: { carrera: true } },
        horario: true,
        // ── Días del horario del usuario ──────────────────────────
        diasSeleccionados: {
          include: { dia: true }
        },
        asistencias: {
          where: { fecha: { gte: inicioDia, lte: finDia } }
        }
      }
    });

    // Día de la semana de la fecha seleccionada en español
    const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaSemanaFecha = DIAS_ES[fechaFiltro.getDay()];

    const data = inscripciones
      .map(ins => {
        const registro = ins.asistencias[0];
        let status = 'Pendiente';
        if (registro) status = registro.asistio ? 'Presente' : 'Ausente';

        const diasHorario = ins.diasSeleccionados?.map(d => d.dia?.nombre).filter(Boolean) ?? [];

        return {
          id_usuario:     ins.id_usuario,
          id_inscripcion: ins.id_inscripcion,
          id_horario:     ins.id_horario,
          usuario:        `${ins.usuario.nombre} ${ins.usuario.apellido_paterno}`,
          correo:         ins.usuario.correo,
          carrera:        ins.usuario.carrera?.nombre_carrera || 'N/A',
          horario:        `${ins.horario.hora_inicio} - ${ins.horario.hora_fin}`,
          estado:         status,
          diasHorario,
        };
      })
      // ── Solo mostrar inscripciones que apliquen al día seleccionado ──
      .filter(ins => {
        if (!ins.diasHorario || ins.diasHorario.length === 0) return true;
        return ins.diasHorario.includes(diaSemanaFecha);
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


exports.registrarAsistencia = async (req, res) => {
  try {
    const { id_usuario, id_inscripcion, id_horario, asistio, id_registrado_por, fecha_registro } = req.body;

    let fechaAfectar = new Date();
    if (fecha_registro) {
      const partes = fecha_registro.split('-');
      fechaAfectar = new Date(partes[0], partes[1] - 1, partes[2]);
    }

    const inicioDia = new Date(fechaAfectar);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaAfectar);
    finDia.setHours(23, 59, 59, 999);

    const asistenciaExistente = await prisma.asistencia.findFirst({
      where: {
        id_usuario: Number(id_usuario),
        fecha: { gte: inicioDia, lte: finDia }
      }
    });

    let resultado;
    if (asistenciaExistente) {
      resultado = await prisma.asistencia.update({
        where: { id_asistencia: asistenciaExistente.id_asistencia },
        data: { asistio: Boolean(asistio), fecha: new Date() }
      });
    } else {
      resultado = await prisma.asistencia.create({
        data: {
          id_usuario:        Number(id_usuario),
          id_inscripcion:    Number(id_inscripcion),
          id_horario:        Number(id_horario),
          fecha:             new Date(),
          asistio:           Boolean(asistio),
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


// ── Auto-marcar ausentes cuando ya pasó su hora de fin ────────────
// El frontend llama a este endpoint cada minuto, o puedes programarlo
// con un cron en el servidor.
exports.autoMarcarAusentes = async (req, res) => {
  try {
    const ahora = new Date();
    const hhmm  = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;

    const inicioDia = new Date(ahora); inicioDia.setHours(0, 0, 0, 0);
    const finDia    = new Date(ahora); finDia.setHours(23, 59, 59, 999);

    // Solo inscripciones activas cuyo horario ya terminó
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estado: 'aprobado' },
      include: {
        horario: true,
        asistencias: {
          where: { fecha: { gte: inicioDia, lte: finDia } }
        }
      }
    });

    let marcados = 0;
    for (const ins of inscripciones) {
      const horaFin = ins.horario?.hora_fin?.substring(0, 5);
      if (!horaFin || hhmm <= horaFin) continue;   // el horario aún no termina
      if (ins.asistencias.length > 0) continue;    // ya tiene registro hoy

      await prisma.asistencia.create({
        data: {
          id_usuario:        ins.id_usuario,
          id_inscripcion:    ins.id_inscripcion,
          id_horario:        ins.id_horario,
          fecha:             new Date(),
          asistio:           false,
          id_registrado_por: 1
        }
      });
      marcados++;
    }

    res.json({ message: `${marcados} ausencias registradas automáticamente` });
  } catch (error) {
    console.error("❌ Error en autoMarcarAusentes:", error);
    res.status(500).json({ message: "Error al marcar ausentes automáticamente" });
  }
};


exports.uploadAndHash = async (req, res) => {
  try {
    const file = req.file;
    const { fecha, id_usuario } = req.body;

    if (!file) return res.status(400).json({ message: "No se recibió archivo" });

    const buffer = fs.readFileSync(file.path);
    const hash   = crypto.createHash("sha256").update(buffer).digest("hex");

    const existente = await prisma.asistenciaHistorico.findFirst({
      where: { hash_archivo: hash }
    });
    if (existente) return res.status(400).json({ message: "El archivo ya existe" });

    await prisma.asistenciaHistorico.create({
      data: {
        nombre_archivo: file.originalname,
        ruta_archivo:   `uploads/${file.filename}`,
        hash_archivo:   hash,
        fecha_lista:    new Date(fecha),
        id_usuario:     parseInt(id_usuario)
      }
    });

    res.json({ message: "Archivo procesado con éxito", hash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al subir" });
  }
};


exports.obtenerHistorico = async (req, res) => {
  try {
    const { q } = req.query;
    const where = {};

    if (q && String(q).trim() !== '') {
      const textoBusqueda = String(q).trim();
      const posibleId     = parseInt(textoBusqueda, 10);
      where.OR = [{ nombre_archivo: { contains: textoBusqueda } }];
      if (!Number.isNaN(posibleId)) where.OR.push({ id_historico: posibleId });
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


exports.getReporteEstadisticas = async (req, res) => {
  try {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estado: 'aprobado' },
      include: {
        usuario: { include: { carrera: true } },
        horario: true,
        asistencias: true
      }
    });

    const reporte = inscripciones.map((ins, index) => {
      const totalAsistencias    = ins.asistencias.length;
      const asistenciasPresente = ins.asistencias.filter(a => a.asistio).length;
      const porcentaje = totalAsistencias > 0
        ? Math.round((asistenciasPresente / totalAsistencias) * 100) : 0;
      const matriculaExtraida = ins.usuario.correo ? ins.usuario.correo.split('@')[0] : 'N/A';

      return {
        id:         ins.id_inscripcion || index,
        matricula:  matriculaExtraida,
        nombre:     `${ins.usuario.nombre} ${ins.usuario.apellido_paterno} ${ins.usuario.apellido_materno}`.trim(),
        carrera:    ins.usuario.carrera?.nombre_carrera || 'N/A',
        servicio:   ins.horario.tipo_actividad || 'General',
        asistencia: `${porcentaje}%`,
        estado:     ins.estado === 'aprobado' ? 'Activo' : 'Inactivo'
      };
    });

    res.json(reporte);
  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    res.status(500).json({ message: "Error al generar el reporte" });
  }
};


exports.getDashboardStats = async (req, res) => {
  try {
    const inscripcionesPendientes = await prisma.inscripcion.count({ where: { estado: 'pendiente' } });
    const usuariosRegistrados     = await prisma.usuario.count({ where: { activo: true } });
    const serviciosActivos        = await prisma.periodo.count({ where: { estado: 'activo' } });

    const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin    = new Date(); hoyFin.setHours(23, 59, 59, 999);
    const asistenciasHoy = await prisma.asistencia.count({
      where: { fecha: { gte: hoyInicio, lte: hoyFin }, asistio: true }
    });

    const interesados = await prisma.listaEspera.count();
    const notificados = await prisma.listaEspera.count({ where: { estado: 'notificado' } });
    const inscritos   = await prisma.inscripcion.count({ where: { estado: 'aprobado' } });
    const anuncios    = await prisma.anuncio.count({ where: { activo: true } });

    const todasAsistencias    = await prisma.asistencia.count();
    const asistenciasPresente = await prisma.asistencia.count({ where: { asistio: true } });
    const asistenciaPromedio  = todasAsistencias > 0
      ? Math.round((asistenciasPresente / todasAsistencias) * 100) : 0;

    const conversion = interesados > 0
      ? ((inscritos / interesados) * 100).toFixed(1) : "0.0";

    const ahora = new Date();
    const inscripcionesMes = Array(12).fill(0);
    const interesadosMes   = Array(12).fill(0);

    for (let i = 0; i < 12; i++) {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 11 + i, 1);
      const fin    = new Date(ahora.getFullYear(), ahora.getMonth() - 11 + i + 1, 0, 23, 59, 59, 999);

      inscripcionesMes[i] = await prisma.inscripcion.count({
        where: { estado: 'aprobado', fecha_inscripcion: { gte: inicio, lte: fin } }
      });
      interesadosMes[i] = await prisma.listaEspera.count({
        where: { fecha_registro: { gte: inicio, lte: fin } }
      });
    }

    res.json({
      basicos:    { inscripcionesPendientes, usuariosRegistrados, asistenciasHoy, serviciosActivos },
      kpis:       { interesados, notificados, inscritos, asistencia: asistenciaPromedio, anuncios },
      insights:   { conversion },
      tendencias: { inscripcionesMes, interesadosMes }
    });
  } catch (error) {
    console.error("❌ Error obteniendo stats del dashboard:", error);
    res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
  }
};