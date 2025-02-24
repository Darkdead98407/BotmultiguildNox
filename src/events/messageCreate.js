const { Events } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getGuildConfig } = require("../utils/guildDataManager");
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Get guild configuration
        const guildId = message.guild?.id;
        if (!guildId) return;

        const guildConfig = await getGuildConfig(guildId);

        // Handle AI chat if in designated channel
        if (guildConfig?.chatChannel && message.channel.id === guildConfig.chatChannel) {
            try {
                const ai = new GoogleGenerativeAI(message.client.config.api.googleAI);
                const model = ai.getGenerativeModel({ model: "gemini-pro" });

                // Read personality file
                const personalityContent = await fs.readFile(
                    path.join(__dirname, "../data/personality.txt"),
                    'utf-8'
                );

                const prompt = `
                    ${personalityContent.trim()}
                    
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
                console.error("Error in AI chat:", error);
            }
        }

        // Handle prefix commands
        const prefix = message.client.config.prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = message.client.commands.get(commandName);
        if (!command) return;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
            await message.reply('Hubo un error al ejecutar el comando.');
        }
    }
};
