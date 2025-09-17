const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { loadData, saveData } = require('../utils/fileStorage');
require('dotenv').config();

const CLIENTID = process.env.CLIENTID;
const SECRET = process.env.SECRET;
const CALLBACK = process.env.CALLBACK;

function setupAuth(app) {
    // Configuración de Passport
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    // Estrategia de Discord
    passport.use(new DiscordStrategy({
        clientID: CLIENTID,
        clientSecret: SECRET,
        callbackURL: CALLBACK,
        scope: ['identify', 'guilds']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const userData = {
                id: profile.id,
                username: profile.username,
                discriminator: profile.discriminator,
                avatar: profile.avatar,
                guilds: profile.guilds.filter(guild => (guild.permissions & 0x8) === 0x8) // Filtrar solo servidores donde es admin
            };

            // Guardar información del usuario
            const users = await loadData('users.json', {});
            users[profile.id] = userData;
            await saveData('users.json', users);

            return done(null, userData);
        } catch (error) {
            return done(error, null);
        }
    }));

    // Middleware para verificar autenticación
    function isAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.redirect('/auth/discord');
    }

    function hasGuildAccess(req, res, next) {
        if (!req.user) return res.redirect('/auth/discord');

        const guildId = req.params.guildId;
        const userGuilds = req.user.guilds || [];

        if (userGuilds.some(g => g.id === guildId && (g.permissions & 0x8) === 0x8)) {
            return next();
        }

        res.status(403).render('error', {
            message: 'No tienes permiso para acceder a la configuración de este servidor'
        });
    }

    // Rutas de autenticación
    app.get('/auth/discord', passport.authenticate('discord'));

    app.get('/auth/discord/callback',
        passport.authenticate('discord', {
            failureRedirect: '/'
        }),
        (req, res) => res.redirect('/dashboard')
    );

    app.get('/auth/logout', (req, res) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    return {
        isAuthenticated,
        hasGuildAccess
    };
}

module.exports = { setupAuth };