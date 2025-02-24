const { Events } = require('discord.js');
const { loadData, saveData } = require('../utils/fileStorage');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        try {
            console.log(`🎉 Bot añadido a nuevo servidor: ${guild.name}`);
            
            // Cargar configuración actual
            const settings = await loadData('botSettings.json', {
                guildsSettings: {}
            });

            // Añadir configuración por defecto para el nuevo servidor
            settings.guildsSettings[guild.id] = {
                name: guild.name,
                id: guild.id,
                joinedAt: new Date().toISOString(),
                prefix: '!',
                welcomeChannel: null,
                logChannel: null,
                moderationEnabled: false,
                automodSettings: {
                    enabled: false,
                    antiSpam: true,
                    antiFlood: true,
                    maxMentions: 5
                },
                permissions: {
                    adminRoles: [],
                    modRoles: []
                }
            };

            // Guardar configuración actualizada
            await saveData('botSettings.json', settings);
            console.log(`✅ Configuración guardada para: ${guild.name}`);

        } catch (error) {
            console.error(`❌ Error al guardar configuración para ${guild.name}:`, error);
        }
    }
};
