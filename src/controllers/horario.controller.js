const prisma = require('../../prisma/client');

// ==========================================
// 1. OBTENER TODOS LOS HORARIOS (CON FILTROS)
// ==========================================
exports.getHorarios = async (req, res) => {
  try {
    const { id_periodo, anio } = req.query; 

    const where = {};
    if (id_periodo) where.id_periodo = Number(id_periodo);
    
    // Filtro por año (ajustado a tu nuevo modelo que usa fecha_inicio_actividades)
    if (anio) {
      where.periodo = {
        fecha_inicio_actividades: {
          gte: new Date(`${anio}-01-01`),
          lte: new Date(`${anio}-12-31`),
        }
      };
    }

    const horarios = await prisma.horario.findMany({
      where,
      include: {
        horarioDias: { include: { dia: true } },
        periodo: true,
      },
      orderBy: { hora_inicio: 'asc' }, 
    });

    const mapped = horarios.map(h => {
      return {
        id_horario: h.id_horario,
        hora_inicio: h.hora_inicio, 
        hora_fin: h.hora_fin,
        tipo_actividad: h.tipo_actividad || 'Gimnasio', 
        capacidad_maxima: h.capacidad_maxima,
        periodo_nombre: h.periodo ? h.periodo.nombre_periodo : 'Sin periodo', 
        anio: h.periodo ? new Date(h.periodo.fecha_inicio_actividades).getFullYear() : 'N/A',
        id_periodo: h.id_periodo,
        dias_semana: h.horarioDias.map(hd => hd.dia ? hd.dia.nombre : '').filter(Boolean).join(', '),
        dias_ids: h.horarioDias.map(hd => hd.id_dia), 
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('❌ ERROR OBTENIENDO HORARIOS:', error);
    res.status(500).json({ message: 'Error obteniendo horarios', detalles: error.message });
  }
};

// ==========================================
// 2. CREAR UN NUEVO HORARIO 
// ==========================================
exports.createHorario = async (req, res) => {
  try {
    const { id_periodo, hora_inicio, hora_fin, tipo_actividad, capacidad_maxima, dias } = req.body;

    if (!id_periodo || !hora_inicio || !hora_fin || !dias || dias.length === 0) {
      return res.status(400).json({ message: "Faltan datos obligatorios (Periodo, Horas o Días)" });
    }

    const nuevoHorario = await prisma.horario.create({
      data: {
        id_periodo: Number(id_periodo),
        hora_inicio: hora_inicio.substring(0, 5), 
        hora_fin: hora_fin.substring(0, 5),
        tipo_actividad: tipo_actividad || 'Gimnasio',
        capacidad_maxima: Number(capacidad_maxima),
        horarioDias: {
          create: dias.map(id_dia => ({ id_dia: Number(id_dia) }))
        }
      },
      include: { horarioDias: true }
    });

    res.status(201).json({ message: 'Horario creado exitosamente', horario: nuevoHorario });
  } catch (error) {
    console.error('❌ ERROR DETALLADO AL CREAR HORARIO:', error);
    res.status(500).json({ message: 'Error al crear el horario', detalles: error.message });
  }
};

// ==========================================
// 3. EDITAR UN HORARIO EXISTENTE
// ==========================================
exports.updateHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_periodo, hora_inicio, hora_fin, tipo_actividad, capacidad_maxima, dias } = req.body;

    const horarioActualizado = await prisma.horario.update({
      where: { id_horario: Number(id) },
      data: {
        id_periodo: id_periodo ? Number(id_periodo) : undefined,
        hora_inicio: hora_inicio ? hora_inicio.substring(0, 5) : undefined,
        hora_fin: hora_fin ? hora_fin.substring(0, 5) : undefined,
        tipo_actividad: tipo_actividad || 'Gimnasio',
        capacidad_maxima: capacidad_maxima ? Number(capacidad_maxima) : undefined,
        ...(dias && dias.length > 0 && {
          horarioDias: {
            deleteMany: {}, 
            create: dias.map(id_dia => ({ id_dia: Number(id_dia) })) 
          }
        })
      },
      include: { horarioDias: true }
    });

    res.json({ message: 'Horario actualizado correctamente', horario: horarioActualizado });
  } catch (error) {
    console.error('❌ ERROR ACTUALIZANDO HORARIO:', error);
    res.status(500).json({ message: 'Error al actualizar el horario', detalles: error.message });
  }
};

// ==========================================
// 4. ELIMINAR HORARIO 
// ==========================================
exports.deleteHorario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const inscripcionesActivas = await prisma.inscripcion.count({
      where: { id_horario: Number(id) }
    });

    if (inscripcionesActivas > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar. Hay ${inscripcionesActivas} alumno(s) inscrito(s) en este horario. Reasígnalos o elimínalos primero.` 
      });
    }

    await prisma.horarioDia.deleteMany({
      where: { id_horario: Number(id) }
    });

    const horarioBorrado = await prisma.horario.delete({
      where: { id_horario: Number(id) }
    });

    res.json({ message: 'Horario eliminado correctamente', horario: horarioBorrado });
  } catch (error) {
    console.error('❌ ERROR ELIMINANDO HORARIO:', error);
    res.status(500).json({ message: 'Error interno al intentar eliminar el horario', detalles: error.message });
  }
};

// ==========================================
// 5. OBTENER LOS DÍAS DE UN HORARIO (¡LA NUEVA FUNCIÓN!)
// ==========================================
exports.getDiasPorHorario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscamos en la tabla intermedia los días que le pertenecen a este horario
    const horarioDias = await prisma.horarioDia.findMany({
      where: { id_horario: Number(id) },
      include: { dia: true } // Incluimos la información completa del día (nombre, etc)
    });

    // Extraemos solo el objeto "dia" para que el frontend lo procese fácilmente
    const dias = horarioDias.map(hd => hd.dia);

    res.json(dias);
  } catch (error) {
    console.error('❌ ERROR OBTENIENDO DÍAS DEL HORARIO:', error);
    res.status(500).json({ message: 'Error interno al obtener los días del horario', detalles: error.message });
  }
};