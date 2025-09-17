const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { loadData, saveData } = require('../utils/fileStorage');
const { getServerConfig, updateServerConfig } = require('../utils/serverConfig');
const { setupAuth } = require('./auth');
require('dotenv').config();

function setupDashboard(client) {
    const app = express();

    // Configurar middleware
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Configurar sesión
    app.use(session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 86400000 // 24 horas
        }
    }));

    // Configurar Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Configurar autenticación
    const { isAuthenticated, hasGuildAccess } = setupAuth(app, process.env.CLIENTID);

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
            botName: client.user.username,
            user: req.user
        });
    });

    // Panel de control (protegido)
    app.get('/dashboard', isAuthenticated, async (req, res) => {
        // Filtrar solo los servidores donde el usuario es administrador
        const userGuilds = req.user.guilds || [];
        const adminGuilds = userGuilds.filter(g => (g.permissions & 0x8) === 0x8);

        // Obtener configuración de cada servidor
        const guildsWithConfig = await Promise.all(adminGuilds.map(async guild => {
            const config = await getServerConfig(guild.id);
            const discordGuild = client.guilds.cache.get(guild.id);
            return {
                ...guild,
                config,
                // Agregar información adicional del bot si está en el servidor
                botIn: !!discordGuild,
                memberCount: discordGuild?.memberCount
            };
        }));

        res.render('dashboard', {
            guilds: guildsWithConfig,
            user: req.user
        });
    });

    // Configuración del servidor (protegida)
    app.get('/dashboard/server/:guildId', isAuthenticated, hasGuildAccess, async (req, res) => {
        const { guildId } = req.params;
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return res.redirect('/dashboard');
        }

        const config = await getServerConfig(guildId);
        res.render('server-config', {
            guild,
            config,
            user: req.user
        });
    });

    // API para guardar configuración (protegida)
    app.post('/api/settings/:guildId', isAuthenticated, hasGuildAccess, async (req, res) => {
        try {
            const { guildId } = req.params;
            const updatedConfig = await updateServerConfig(guildId, req.body);
            res.json({ success: true, config: updatedConfig });
        } catch (error) {
            console.error('Error saving settings:', error);
            res.status(500).json({ error: 'Error saving settings' });
        }
    });

    // Dejar que el panel del servidor maneje el puerto
    const PORT = process.env.PORT;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Panel de control web iniciado en el puerto ${PORT}`);
    });

    return app;
}

module.exports = { setupDashboard };