const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../../config.json");
const fs = require('fs').promises;
const path = require('path');
const { getGuildConfig } = require("../utils/guildDataManager");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        // Ignorar mensajes de bots
        if (message.author.bot) return;

        // Obtener la configuración del servidor
        const guildId = message.guild?.id;
        if (!guildId) return;

        const guildConfig = await getGuildConfig(guildId);

        // Verificar si el sistema de Chat IA está activado en el servidor
        if (!guildConfig || !guildConfig.chatChannel) return;

        try {
            const MODEL = "gemini-pro";
            const API_KEY = config.api.googleAI;

            const ai = new GoogleGenerativeAI(API_KEY);
            const model = ai.getGenerativeModel({
                model: MODEL,
            });

            // Verificar si el mensaje fue enviado en el canal configurado
            if (message.channel.id !== guildConfig.chatChannel) return;

            // Leer el archivo de personalidad
            const personalityFilePath = path.join(__dirname, "../data/personality.txt");
            const personalityContent = await fs.readFile(personalityFilePath, 'utf-8');

            // Crear el prompt para la IA
            const prompt = `
${personalityContent}

Instructions:
1. Saluda al usuario: <@${message.author.id}>
2. Responda al siguiente mensaje manteniendo la personalidad descrita anteriormente.
3. Responda con menos de 2000 caracteres.

User message: ${message.cleanContent}

Your response:`;

            // Generar la respuesta con la IA
            const { response } = await model.generateContent(prompt);
            const generatedText = response.text().trim();

            // Asegurarse de que la respuesta no esté vacía y dentro del límite de caracteres
            const finalResponse = generatedText.length > 0 ? 
                (generatedText.length > 2000 ? generatedText.substring(0, 1997) + "..." : generatedText) : 
                "Lo siento, no pude generar una respuesta apropiada.";

            // Responder al mensaje
            await message.reply({
                content: finalResponse,
                allowedMentions: {
                    parse: ["users"],
                },
            });

        } catch (error) {
            console.error("Error en el evento messageCreate:", error);
            return;
        }
    },
};