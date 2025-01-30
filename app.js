import express, {request, response} from "express";
import session from "express-session";
import {v4 as uuidv4} from 'uuid';
import os from "os";

const app = express();
const PORT = 3100;

app.listen(PORT, ()=>{
    console.log(`Servidor iniciado en http://localhost:${PORT}`)
});
app.use(express.json())
app.use(express.urlencoded({extended: true}));

//Sesiones almacenadas en memoria RAM
const sessions = {};
app.use(session({
    secret: 'P4-UAMT#Sung_jin-Woo-SesionesHTTP-VariablesDeSesion', //Secreto para afirmar la cookie de sesión
    resave: false, // No resguardar la sesión si o ha sido modificada
    saveUninitialized: true, //Guarda la sesión aunque no haya sido inicializada
    cookie: { maxAge: 5 * 60 * 1000} //Usar secure: ture si solo usas HTTPS, con maxAge permite definir la duracion máxima de la sesión
}));

app.get('/',(req, res)=>{
    return res.status(200).json({message:"Bienvenid@ al API de control de sesiones",
                                    author: "Uriel Abdallah Medina Torres"
});
});

//funcion de utilidad que nos permitira acceder a la informacion de la interfaz de la red
const getLocalIP = () =>{
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces){
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            //IPv4 y no interna (no localhost)
            if(iface.family === "IPv4" && !iface.internal){
                return iface.address
            }
        }
    }
    return null; //retorna null si no se encuentra una IP válida
}

app.post('/login', (req, res)=>{
    const{email, nickname, macAddress}= req.body;

    if(!email|| !nickname || !macAddress){
        return res.status(400).json({message: "Se espera camposrequeridos"})
    }
    const sessionID=uuidv4();
    const now= new Date();
    sessions[sessionID] ={
        sessionID,
        email,
        nickname,
        macAddress,
        ip: getLocalIP(req),
        createdAt: now,
        lastAccesed:now
    };
    res.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionID,
        });
});
app.post('/logout',(req, res)=>{
    const {sessionID}=req.body;

    if(!sessionID || !sessions[sessionID]){
        return res.status(404).json({message: "No se ha encontrado una sesion activa"})
    }

    delete sessions[sessionID];
    req.session.destroy((err)=>{
        if(err){
            return res.status(500).send('Error al cerrar sesion')
        }else{
            res.status(200).json({message:"logout successfull"})
        }
    })
    
});
app.put('/update',(req, res)=>{
    const{sessionID}= req.body;
    if(!sessionID || !sessions[sessionID]){
        return res.status(404).json({message: "No se ha encontrado una sesion activa"})
    }
    sessions[sessionID].lastAccessed = new Date();
    res.send.json({message:"Sesion actualizada",session: req.session.user});
    // if(email) sessions[sessionID].email=email;
    // if(nickname) sessions[sessionID].nickname=nickname;
    // sessions[sessionID].lastAcceses= newDate();
});

app.get('/status', (req, res) => {
    const {sessionID} = req.query.sessionID;
    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No hay sesiones activas" });
    }

    const session = sessions[sessionID];
    if (session.createdAt) {
        const now = new Date();
        const started = new Date(session.createdAt);
        const lastUpdate = new Date(session.lastAccessed);
        const name = session.nickname;

        // Calcular antigüedad de la sesión
        const sessionAgeMs = now - started;
        const hours = Math.floor(sessionAgeMs / (1000 * 60 * 60));
        const minutes = Math.floor((sessionAgeMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((sessionAgeMs % (1000 * 60)) / 1000);

        // Convertir las fechas al uso horario de CDMX
        const createdAT_MX = moment(started).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
        const lastAccess_MX = moment(lastUpdate).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');

        return res.json({
            mensaje: 'Estado de la sesión',
            SessionId: sessionID,
            Usuario: name,
            inicio: createdAT_MX,
            ultimoAcceso: lastAccess_MX,
            antiguedad: `${hours} horas, ${minutes} minutos y ${seconds} segundos`,
        });
    }

    res.status(200).json({
        message: "Sesión activa",
        session: session
    });
});