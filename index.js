const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { join } = require('path');
const { deployCommands } = require('./deploy-commands');
const { setupDashboard } = require('./dashboard/server');
require('dotenv').config();

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
    token: process.env.TOKEN,
    clientId: process.env.CLIENTID
};

// Función principal de inicio
async function startBot() {
    try {
        console.log('🚀 Iniciando bot...');

       // Cargar comandos y eventos
        await loadCommands(client);
        await loadEvents(client);

        // Verificar token
        if (!process.env.TOKEN) {
            throw new Error('No se encontró el token del bot en las variables de entorno ni en config.json');
        }

        // Iniciar sesión
        await client.login(process.env.TOKEN);
        console.log(`✅ Bot iniciado como ${client.user.tag}`);
 
        await deployCommands();


        // Iniciar panel de control web
        setupDashboard(client);

    } catch (error) {
        console.error('❌ Error al inicializar el bot:', error);
        process.exit(1); // Salir con error para que el panel del servidor pueda reiniciar el bot
    }
}

// Manejo de errores no capturados
process.on('unhandledRejection', error => {
    console.error('❌ Promesa rechazada no manejada:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1); // Salir con error para que el panel del servidor pueda reiniciar el bot
});

// Iniciar el bot
startBot();