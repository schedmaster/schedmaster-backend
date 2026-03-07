const crypto = require("crypto")
const fs = require("fs")

const prisma = require("../../prisma/client")

/* ==========================
   SUBIR ARCHIVO + HASH
========================== */

exports.uploadAndHash = async (req,res)=>{

  try{

    const file = req.file
    const {fecha,id_usuario} = req.body

    if(!file){
      return res.status(400).json({
        message:"No se recibió ningún archivo"
      })
    }

    const buffer = fs.readFileSync(file.path)

    const hash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex")

    const existente = await prisma.asistenciaHistorico.findUnique({
      where:{
        hash_archivo:hash
      }
    })

    if(existente){
      return res.json({
        message:"Este archivo ya fue subido anteriormente",
        filename:file.originalname,
        hash:hash
      })
    }

    await prisma.asistenciaHistorico.create({

      data:{
        nombre_archivo:file.originalname,
        ruta_archivo:file.path,
        hash_archivo:hash,
        fecha_lista:new Date(fecha),
        id_usuario:parseInt(id_usuario)
      }

    })

    res.json({
      message:"Archivo subido y hash generado con éxito.",
      filename:file.originalname,
      hash:hash
    })

  }catch(error){

    console.error(error)

    res.status(500).json({
      message:"Error al subir archivo"
    })

  }

}

/* ==========================
   OBTENER HISTÓRICO
========================== */
exports.obtenerHistorico = async (req,res)=>{

  try{

    const archivos = await prisma.asistenciaHistorico.findMany({

      include:{
        usuario:true
      },

      orderBy:{
        fecha_subida:"desc"
      }

    })

    const resultado = archivos.map(a => ({

      id: a.id_historico,
      archivo: a.nombre_archivo,
      fecha: a.fecha_lista,
      fecha_subida: a.fecha_subida,   
      subidoPor: a.usuario?.nombre || "Admin",
      ruta_archivo: a.ruta_archivo    

    }))

    res.json(resultado)

  }catch(error){

    console.error(error)

    res.status(500).json({
      message:"Error obteniendo histórico"
    })

  }

}