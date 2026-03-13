const crypto = require("crypto")
const fs = require("fs")

const prisma = require("../../prisma/client")

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

const existente = await prisma.asistenciaHistorico.findFirst({
where:{
hash_archivo:hash
}
})

if(existente){
return res.json({
message:"Este archivo ya fue subido anteriormente"
})
}

await prisma.asistenciaHistorico.create({

data:{
nombre_archivo:file.originalname,
ruta_archivo:`uploads/${file.filename}`,
hash_archivo:hash,
fecha_lista:new Date(fecha),
id_usuario:parseInt(id_usuario)
}

})

res.json({
message:"Archivo subido y hash generado con éxito",
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
   OBTENER HISTORICO
========================== */

exports.obtenerHistorico = async (req,res)=>{

try{

const historico = await prisma.asistenciaHistorico.findMany({
orderBy:{
fecha_lista:"desc"
}
})

res.json(historico)

}catch(error){

console.error(error)

res.status(500).json({
message:"Error al obtener histórico"
})

}

}