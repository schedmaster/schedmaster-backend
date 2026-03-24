const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");

// 1. OBTENER DATOS PARA LA TABLA DE MONITOREO
exports.getAsistenciasAdmin = async (req, res) => {
  try {
    const { fecha, id_horario, estado, id_carrera } = req.query;
    const fechaFiltro = fecha ? new Date(fecha) : new Date();
    const inicioDia = new Date(fechaFiltro.setHours(0, 0, 0, 0));
    const finDia = new Date(fechaFiltro.setHours(23, 59, 59, 999));

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

// 2. REGISTRAR ASISTENCIA (EL BOTÓN DE LA TABLA)
exports.registrarAsistencia = async (req, res) => {
  try {
    const { id_usuario, id_inscripcion, id_horario, asistio, id_registrado_por } = req.body;

    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));

    // Verificamos si ya existe una asistencia hoy para este usuario
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

// 3. SUBIR ARCHIVO Y GENERAR HASH (TU LÓGICA)
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

// 4. OBTENER HISTÓRICO
exports.obtenerHistorico = async (req, res) => {
  try {
    const historico = await prisma.asistenciaHistorico.findMany({
      orderBy: { fecha_lista: "desc" }
    });
    res.json(historico);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener histórico" });
  }
};