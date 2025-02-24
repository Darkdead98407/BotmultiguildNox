const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const cookieParser = require('cookie-parser');

function setupDashboard(client) {
    const app = express();

    // Configurar middleware
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Crear directorio data si no existe
    const dataDir = path.join(__dirname, '../data');
    require('fs').mkdirSync(dataDir, { recursive: true });

    // Configurar sesión
    app.use(session({
        store: new SQLiteStore({
            db: 'sessions.db',
            dir: dataDir
        }),
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 86400000 // 24 horas
        }
    }));

    // Middleware para pasar client a todas las rutas
    app.use((req, res, next) => {
        req.client = client;
        next();
    });

    // Rutas
    app.get('/', (req, res) => {
        res.render('index', {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            botName: client.user.username
        });
    });

    // Ruta de autenticación con Discord
    app.get('/auth/discord', (req, res) => {
        res.send('Autenticación con Discord pendiente de implementar');
    });

    // Panel de control
    app.get('/dashboard', (req, res) => {
        res.render('dashboard', {
            guilds: Array.from(client.guilds.cache.values())
        });
    });

    // Iniciar servidor
    const PORT = process.env.DASHBOARD_PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Panel de control web iniciado en el puerto ${PORT}`);
    });

    return app;
}

module.exports = { setupDashboard };