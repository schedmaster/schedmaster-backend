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
    res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
  }
};