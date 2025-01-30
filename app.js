import express from "express";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import moment from "moment-timezone"; // Importar moment-timezone

const app = express();
const PORT = 3100;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones almacenadas en memoria RAM
const sessions = {};

app.use(session({
    secret: 'P4-UAMT#Sung_jin-Woo-SesionesHTTP-VariablesDeSesion',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2 * 60 * 1000 } // 5 minutos
}));

app.get('/', (req, res) => {
    return res.status(200).json({
        message: "Bienvenid@ al API de control de sesiones",
        author: "Uriel Abdallah Medina Torres"
    });
});

// Función para obtener la IP local
const getLocalIP = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
};

// **LOGIN**
app.post('/login', (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionID = uuidv4();
    const now = new Date();

    sessions[sessionID] = {
        sessionID,
        email,
        nickname,
        macAddress,
        ip: getLocalIP(),
        createdAt: now,
        lastAccessed: now
    };

    res.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionID,
    });
});

// **LOGOUT**
app.post('/logout', (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No se ha encontrado una sesión activa" });
    }

    delete sessions[sessionID];

    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.status(200).json({ message: "Logout exitoso" });
    });
});

// **ACTUALIZAR SESIÓN**
app.put('/update', (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No se ha encontrado una sesión activa" });
    }

    sessions[sessionID].lastAccessed = new Date();

    res.json({
        message: "Sesión actualizada",
        session: sessions[sessionID]
    });
});

// **ESTADO DE SESIÓN**
app.get('/status', (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: "No hay sesiones activas" });
    }

    const session = sessions[sessionID];
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
        antiguedad: `${hours} horas, ${minutes} minutos y ${seconds} segundos`
    });
});
//Todas las sesiones
app.get("/sesiones", (req, res) => {
    const sessionCount = Object.keys(sessions).length;

    if (sessionCount === 0) {
        return res.status(200).json({
            message: "No hay sesiones activas",
            count: 0,
            sessions: []
        });
    }

    const activeSessions = Object.values(sessions).map(session => {
        const inactivityTime = calculateInactivityTime(session.lastAccessed);
        return {
            sessionId: session.sessionID,
            email: session.email,
            nickname: session.nickname,
            clientInfo: {
                ip: session.ip,
                mac: session.macAddress
            },
            createAt: session.createdAt,
            lastAccessed: session.lastAccessed,
            inactivityTime: `${inactivityTime.hours}h ${inactivityTime.minutes}m ${inactivityTime.seconds}s`
        };
    });

    return res.status(200).json({
        message: "Sesiones activas encontradas",
        count: activeSessions.length,
        sessions: activeSessions
    });
});

// **Función para calcular inactividad**
const calculateInactivityTime = (lastAccessed) => {
    const now = new Date();
    const elapsedMs = now - new Date(lastAccessed);
    return {
        hours: Math.floor(elapsedMs / (1000 * 60 * 60)),
        minutes: Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((elapsedMs % (1000 * 60)) / 1000)
    };
};
