const { Events, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getGuildConfig } = require("../utils/guildDataManager");
const fs = require('fs').promises;
const path = require('path');
const animeActions = require('anime-actions');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        console.log(`📝 [DEBUG] MessageCreate ejecutado para mensaje ID: ${message.id}`);
        console.log(`📝 [DEBUG] Canal: ${message.channel.name}, Autor: ${message.author.tag}`);
        console.trace('📝 [DEBUG] Traza de ejecución de messageCreate');

        // Ignorar mensajes de bots
        if (message.author.bot) {
            console.log(`📝 [DEBUG] Mensaje ignorado: es de un bot`);
            return;
        }

        // Obtener configuración del servidor
        const guildId = message.guild?.id;
        if (!guildId) {
            console.log(`📝 [DEBUG] Mensaje ignorado: no es de un servidor`);
            return;
        }

        try {
            // Emitir evento para el sistema de conteo si el mensaje está en el canal correcto
            if (message.channel.id === message.client.config.channels?.counting) {
                console.log(`📝 [DEBUG] Emitiendo evento CountingMessage`);
                message.client.emit('CountingMessage', message);
                return; // No procesar más el mensaje si es del canal de conteo
            }

            const guildConfig = await getGuildConfig(guildId);

            // Manejar chat AI si está en el canal designado
            if (guildConfig?.chatChannel && message.channel.id === guildConfig.chatChannel) {
                console.log(`📝 [DEBUG] Procesando mensaje en canal de chat AI`);
                try {
                    const MODEL = "gemini-pro";
                    const API_KEY = message.client.config.api.googleAI;

                    const ai = new GoogleGenerativeAI(API_KEY);
                    const model = ai.getGenerativeModel({ model: MODEL });

                    // Leer archivo de personalidad
                    const personalityFilePath = path.join(__dirname, "../data/personality.txt");
                    const personalityContent = await fs.readFile(personalityFilePath, 'utf-8');

                    const prompt = `
                        ${personalityContent}

                        Instructions:
                        1. Greet user: <@${message.author.id}>
                        2. Respond to: ${message.cleanContent}
                        3. Keep response under 2000 characters.
                    `;

                    const { response } = await model.generateContent(prompt);
                    const responseText = response.text().slice(0, 1997) + "...";

                    await message.reply({
                        content: responseText,
                        allowedMentions: { parse: ["users"] }
                    });
                } catch (error) {
                    console.error("Error en chat AI:", error);
                }
                return;
            }

            // Manejar comandos con prefijo
            const prefix = message.client.config.prefix;
            if (!message.content.startsWith(prefix)) {
                console.log(`📝 [DEBUG] Mensaje ignorado: no comienza con prefijo`);
                return;
            }

            console.log(`📝 [DEBUG] Procesando comando con prefijo`);
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Manejar comandos de anime
            const animeCommands = ['hug', 'kiss', 'pat', 'punch', 'slap', 'bite', 'bonk', 'cry', 'dance', 'help'];

            if (commandName === 'help') {
                console.log(`📝 [DEBUG] Ejecutando comando help`);
                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setTitle('🎭 Comandos de Anime Disponibles')
                    .setDescription('Lista de todos los comandos de anime y sus descripciones:')
                    .addFields([
                        { name: '!hug @usuario', value: '¡Da un abrazo cálido y reconfortante! 🤗', inline: true },
                        { name: '!kiss @usuario', value: '¡Comparte un dulce beso! 💋', inline: true },
                        { name: '!pat @usuario', value: '¡Da unas palmaditas cariñosas! 🤚', inline: true },
                        { name: '!punch @usuario', value: '¡Dale un puñetazo anime style! 👊', inline: true },
                        { name: '!slap @usuario', value: '¡Una bofetada con todo el poder! ✋', inline: true },
                        { name: '!bite @usuario', value: '¡Muerde juguetonamente! 😬', inline: true },
                        { name: '!bonk @usuario', value: '¡Dale un golpecito en la cabeza! 🔨', inline: true },
                        { name: '!cry', value: '¡Muestra tus lágrimas anime! 😢', inline: true },
                        { name: '!dance', value: '¡Baila de felicidad! 💃', inline: true }
                    ])
                    .setFooter({ text: 'Usa estos comandos con el prefijo ! y mencionando a un usuario (@usuario)' })
                    .setTimestamp();

                return await message.reply({ embeds: [embed] });
            }

            if (animeCommands.includes(commandName)) {
                console.log(`📝 [DEBUG] Ejecutando comando de anime: ${commandName}`);
                try {
                    let url;
                    const target = message.mentions.users.first();

                    // Comandos que no requieren target
                    if (commandName === 'cry' || commandName === 'dance') {
                        url = await animeActions[commandName]();
                        const embed = new EmbedBuilder()
                            .setColor('#FF69B4')
                            .setDescription(`${message.author} ${getActionText(commandName)}`)
                            .setImage(url)
                            .setTimestamp();

                        return await message.reply({ embeds: [embed] });
                    }

                    // Comandos que requieren target
                    if (!target) {
                        return await message.reply('¡Necesitas mencionar a un usuario! Por ejemplo: !hug @usuario');
                    }

                    url = await animeActions[commandName]();
                    const embed = new EmbedBuilder()
                        .setColor('#FF69B4')
                        .setDescription(`${message.author} ${getActionText(commandName)} ${target}${getSuffix(commandName)}`)
                        .setImage(url)
                        .setTimestamp();

                    await message.reply({ embeds: [embed] });
                } catch (error) {
                    console.error(`Error al ejecutar el comando ${commandName}:`, error);
                    await message.reply('Hubo un error al ejecutar el comando. ¡Inténtalo de nuevo!');
                }
            }
        } catch (error) {
            console.error('Error en messageCreate:', error);
        }

        console.log(`📝 [DEBUG] Fin de procesamiento de messageCreate para mensaje ID: ${message.id}`);
    }
};

function getActionText(action) {
    const actions = {
        hug: 'abraza a',
        kiss: 'besa a',
        pat: 'acaricia a',
        punch: 'golpea a',
        slap: 'abofetea a',
        bite: 'muerde a',
        bonk: 'le da un golpe en la cabeza a',
        cry: 'está llorando',
        dance: 'está bailando'
    };
    return actions[action] || 'interactúa con';
}

function getSuffix(action) {
    const suffixes = {
        hug: '!',
        kiss: '!',
        pat: '!',
        punch: '!',
        slap: '!',
        bite: '!',
        bonk: '!'
    };
    return suffixes[action] || '';
}