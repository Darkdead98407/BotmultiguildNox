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
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();
client.events = new Collection();
client.config = {
    ...config,
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.BOT_CLIENT_ID
};

// Initialize handlers
(async () => {
    try {
        console.log('Iniciando bot...');
        await loadCommands(client);
        await loadEvents(client);

        if (!process.env.DISCORD_BOT_TOKEN) {
            throw new Error('Token de Discord no encontrado en las variables de entorno');
        }

        await client.login(process.env.DISCORD_BOT_TOKEN);
        console.log('Bot iniciado correctamente!');
    } catch (error) {
        console.error('Error al inicializar el bot:', error);
    }
})();

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});