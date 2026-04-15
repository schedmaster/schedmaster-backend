const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");

exports.getAsistenciasAdmin = async (req, res) => {
  try {
    // 1. AHORA SÍ RECIBIMOS EL id_periodo DEL FRONTEND
    const { fecha, id_horario, estado, id_carrera, id_periodo } = req.query; 
    
    let periodoIdParaFiltrar;

    // 2. LÓGICA DINÁMICA: Si seleccionaron uno en el menú, usamos ese. Si no, buscamos el activo.
    if (id_periodo) {
      periodoIdParaFiltrar = Number(id_periodo);
    } else {
      const periodoActivo = await prisma.periodo.findFirst({
        where: { estado: 'activo' }
      });

      if (!periodoActivo) {
        return res.status(404).json({ message: "No hay ninguna convocatoria activa." });
      }
      periodoIdParaFiltrar = periodoActivo.id_periodo;
    }

    // 3. CORRECCIÓN ZONA HORARIA
    let fechaFiltro = new Date(); 
    if (fecha) {
      const partes = fecha.split('-'); 
      fechaFiltro = new Date(partes[0], partes[1] - 1, partes[2]); 
    }

    const inicioDia = new Date(fechaFiltro);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaFiltro);
    finDia.setHours(23, 59, 59, 999);

    // 4. CONSULTA A PRISMA CON LA VARIABLE DINÁMICA
    const inscripciones = await prisma.inscripcion.findMany({
      where: {
        estado: 'aprobado',
        id_periodo: periodoIdParaFiltrar, // <-- AQUÍ SE APLICA EL FILTRO REAL
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

    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaServidorString = `${anio}-${mes}-${dia}`;

    if (fecha_registro && fecha_registro !== fechaServidorString) {
      return res.status(400).json({ 
        message: "No se puede registrar o modificar asistencia para días anteriores o posteriores al día de hoy." 
      });
    }

    const inicioDia = new Date(fechaActual);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fechaActual);
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
          id_usuario: Number(id_usuario),
          id_inscripcion: Number(id_inscripcion),
          id_horario: Number(id_horario),
          fecha: new Date(), 
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
      const totalAsistencias = ins.asistencias.length;
      const asistenciasPresente = ins.asistencias.filter(a => a.asistio).length;
      
      const porcentaje = totalAsistencias > 0 
        ? Math.round((asistenciasPresente / totalAsistencias) * 100) 
        : 0;

      const matriculaExtraida = ins.usuario.correo ? ins.usuario.correo.split('@')[0] : 'N/A';

      return {
        id: ins.id_inscripcion || index, 
        matricula: matriculaExtraida,
        nombre: `${ins.usuario.nombre} ${ins.usuario.apellido_paterno} ${ins.usuario.apellido_materno}`.trim(),
        carrera: ins.usuario.carrera?.nombre_carrera || 'N/A',
        servicio: ins.horario.tipo_actividad || 'General',
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

    const ultimasPendientesRaw = await prisma.inscripcion.findMany({
      where: { estado: 'pendiente' },
      orderBy: { fecha_inscripcion: 'desc' },
      take: 5, 
      include: {
        usuario: { include: { carrera: true } },
        horario: true
      }
    });

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
      ultimasPendientes
    });
  } catch (error) {
    console.error("❌ Error obteniendo stats del dashboard:", error);
    res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
  }
};