const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('../config.json');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions, // Necesario para reacciones
        GatewayIntentBits.GuildVoiceStates      // Para futuros comandos de voz
    ]
});

client.commands = new Collection();
client.events = new Collection();
client.config = config;

// Initialize handlers
(async () => {
    try {
        console.log('Iniciando bot...');
        await loadCommands(client);
        await loadEvents(client);

        if (!config.token) {
            throw new Error('Token no encontrado en config.json');
        }

        await client.login(config.token);
        console.log('Bot iniciado correctamente!');
    } catch (error) {
        console.error('Error al inicializar el bot:', error);
    }
})();

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Manejo de errores global
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});