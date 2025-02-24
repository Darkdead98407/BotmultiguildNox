const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('../config.json');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { join } = require('path');
const { deployCommands } = require('./deploy-commands');
const { setupDashboard } = require('./dashboard/server');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Inicializar colecciones
client.commands = new Collection();
client.config = {
    ...config,
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.BOT_CLIENT_ID
};

// Limpiar caché y recargar handlers
(async () => {
    try {
        console.log('Iniciando bot...');

        // Limpiar caché de comandos y eventos
        Object.keys(require.cache).forEach(key => {
            if (key.includes(join(__dirname, 'commands')) || 
                key.includes(join(__dirname, 'events'))) {
                console.log('🧹 Limpiando caché para:', key);
                delete require.cache[key];
            }
        });

        // Cargar comandos y eventos
        await loadCommands(client);
        await loadEvents(client);

        // Log para verificar listeners de messageCreate
        console.log(`🔍 Cantidad de listeners para messageCreate antes de iniciar: ${client.listenerCount('messageCreate')}`);

        if (!process.env.DISCORD_BOT_TOKEN) {
            throw new Error('Token de Discord no encontrado en las variables de entorno');
        }

        // Iniciar sesión
        await client.login(process.env.DISCORD_BOT_TOKEN);
        console.log('Bot iniciado correctamente!');
        console.log(`🔍 Cantidad de listeners para messageCreate después de iniciar: ${client.listenerCount('messageCreate')}`);

        // Ejecutar deploy-commands.js para registrar comandos slash
        console.log('🔄 Iniciando registro de comandos slash...');
        await deployCommands();
        console.log('✅ Registro de comandos slash completado');

        // Iniciar panel de control web
        setupDashboard(client);

    } catch (error) {
        console.error('Error al inicializar el bot:', error);
    }
})();

// Manejo de errores
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});