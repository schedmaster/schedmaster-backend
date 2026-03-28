const crypto = require("crypto");
const fs = require("fs");
const prisma = require("../../prisma/client");

exports.uploadAndHash = async (req,res)=>{
  try{
    const file = req.file;
    const {fecha,id_usuario} = req.body;

    if(!file){
      return res.status(400).json({ message:"No se recibió ningún archivo" });
    }

    const buffer = fs.readFileSync(file.path);

    const hash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    const existente = await prisma.asistenciaHistorico.findFirst({
      where:{ hash_archivo:hash }
    });

    if(existente){
      return res.json({ message:"Este archivo ya fue subido anteriormente" });
    }

    await prisma.asistenciaHistorico.create({
      data:{
        nombre_archivo:file.originalname,
        ruta_archivo:`uploads/${file.filename}`,
        hash_archivo:hash,
        fecha_lista:new Date(fecha),
        id_usuario:parseInt(id_usuario)
      }
    });

    res.json({
      message:"Archivo subido y hash generado con éxito",
      filename:file.originalname,
      hash:hash
    });

  }catch(error){
    console.error(error);
    res.status(500).json({ message:"Error al subir archivo" });
  }
};


/* ==========================
   OBTENER HISTORICO
========================== */
exports.obtenerHistorico = async (req,res)=>{
  try{
    const historico = await prisma.asistenciaHistorico.findMany({
      orderBy:{ fecha_lista:"desc" }
    });

    res.json(historico);

  }catch(error){
    console.error(error);
    res.status(500).json({ message:"Error al obtener histórico" });
  }
};


/* ==========================
   OBTENER ASISTENCIAS (CRUD)
========================== */
exports.obtenerAsistencias = async (req, res) => {
  try {

    const asistencias = await prisma.inscripcion.findMany({
      include: {
        usuario: true,
        horario: true,
        asistencias: true // 👈 IMPORTANTE
      }
    });

    const formateadas = asistencias.map(a => {

      let estado = "pendiente";

      if (a.asistencias.length > 0) {
        estado = a.asistencias[0].asistio ? "presente" : "ausente";
      }

      return {
        id: a.id_inscripcion,
        nombre: a.usuario.nombre,
        apellido: a.usuario.apellido_paterno,
        iniciales: a.usuario.nombre[0] + a.usuario.apellido_paterno[0],
        horarioInicio: a.horario.hora_inicio,
        horarioFin: a.horario.hora_fin,
        tipoEntrenamiento: a.horario.tipo_actividad || "General",
        carrera: a.usuario.id_carrera || "N/A",
        matricula: a.usuario.id_usuario,
        estado // 🔥 dinámico
      };

    });

    res.json(formateadas);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo asistencias" });
  }
};


/* ==========================
   MARCAR ASISTENCIA
========================== */
exports.marcarAsistencia = async (req, res) => {
  try {
    const { id_inscripcion, asistio } = req.body;

    // 🔥 traer inscripción real
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id_inscripcion: parseInt(id_inscripcion) }
    });

    if (!inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    // 🔥 evitar duplicados (IMPORTANTE)
    const existente = await prisma.asistencia.findFirst({
      where: {
        id_inscripcion: inscripcion.id_inscripcion
      }
    });

    if (existente) {
      // actualizar en lugar de crear
      await prisma.asistencia.update({
        where: { id_asistencia: existente.id_asistencia },
        data: { asistio }
      });

      return res.json({ message: "Asistencia actualizada" });
    }

    // 🔥 crear correctamente
    await prisma.asistencia.create({
      data: {
        id_usuario: inscripcion.id_usuario,
        id_inscripcion: inscripcion.id_inscripcion,
        id_horario: inscripcion.id_horario, // 👈 ESTE ES EL FIX REAL
        fecha: new Date(),
        asistio,
        id_registrado_por: inscripcion.id_usuario
      }
    });

    res.json({ message: "Asistencia registrada" });

  } catch (error) {
    console.error("ERROR ASISTENCIA:", error);
    res.status(500).json({ message: "Error registrando asistencia" });
  }
};


/* ==========================
   OBTENER DATOS PARA LA TABLA DE MONITOREO
========================== */
// 1. OBTENER DATOS PARA LA TABLA DE MONITOREO
exports.getAsistenciasAdmin = async (req, res) => {
  try {
    const { fecha, id_horario, estado, id_carrera, q } = req.query;
    
    // 👈 CORRECCIÓN ZONA HORARIA: Manejo explícito de la fecha para evitar desfases
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

    const where = {
      estado: 'aprobado',
      id_horario: id_horario && id_horario !== 'Todos' ? Number(id_horario) : undefined,
      usuario: {
        id_carrera: id_carrera && id_carrera !== 'Todas' ? Number(id_carrera) : undefined
      }
    };

    if (q && String(q).trim() !== '') {
      const textoBusqueda = String(q).trim();
      const posibleIdUsuario = parseInt(textoBusqueda, 10);

      where.usuario.OR = [
        { nombre: { contains: textoBusqueda } },
        { apellido_paterno: { contains: textoBusqueda } },
        { apellido_materno: { contains: textoBusqueda } }
      ];

      if (!Number.isNaN(posibleIdUsuario)) {
        where.usuario.OR.push({ id_usuario: posibleIdUsuario });
      }
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where,
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