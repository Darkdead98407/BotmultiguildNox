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
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();
client.events = new Collection();
client.config = config;

// Initialize handlers
(async () => {
    try {
        await loadCommands(client);
        await loadEvents(client);
        await client.login(config.token);
    } catch (error) {
        console.error('Error initializing bot:', error);
    }
})();

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
