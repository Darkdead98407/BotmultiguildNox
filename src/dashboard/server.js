const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const { loadData, saveData } = require('../utils/fileStorage');

function setupDashboard(client) {
    const app = express();

    // Configurar middleware
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Configurar sesión usando archivo JSON
    app.use(session({
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
    app.get('/', async (req, res) => {
        const settings = await loadData('botSettings.json', {
            guildsSettings: {}
        });

        res.render('index', {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            botName: client.user.username,
            settings
        });
    });

    // Panel de control
    app.get('/dashboard', async (req, res) => {
        const settings = await loadData('botSettings.json', {
            guildsSettings: {}
        });

        const guilds = Array.from(client.guilds.cache.values()).map(guild => ({
            ...guild,
            settings: settings.guildsSettings[guild.id] || {}
        }));

        res.render('dashboard', { guilds });
    });

    // API para guardar configuración
    app.post('/api/settings/:guildId', async (req, res) => {
        try {
            const { guildId } = req.params;
            const settings = await loadData('botSettings.json', {
                guildsSettings: {}
            });

            settings.guildsSettings[guildId] = {
                ...settings.guildsSettings[guildId],
                ...req.body
            };

            await saveData('botSettings.json', settings);
            res.json({ success: true });
        } catch (error) {
            console.error('Error saving settings:', error);
            res.status(500).json({ error: 'Error saving settings' });
        }
    });

    // Dejar que el panel del servidor maneje el puerto
    app.listen(process.env.PORT || 3000, () => {
        console.log(`🌐 Panel de control web iniciado`);
    });

    return app;
}

module.exports = { setupDashboard };