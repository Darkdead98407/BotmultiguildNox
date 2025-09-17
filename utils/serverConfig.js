const { loadData, saveData } = require('./fileStorage');

async function getServerConfig(guildId) {
    const settings = await loadData('botSettings.json', {
        guildsSettings: {}
    });

    return settings.guildsSettings[guildId] || {
        roles: {
            admin: null,
            dev: null,
            user: null
        },
        channels: {
            welcome: null,
            counting: null,
            tickets: null,
            commands: null,
            minigames: null,
            ai: null,
            verification: null,
            authors: null,
            nsfw: null
        },
        authorCategories: {
            colors: [],
            platform: ['Java', 'Bedrock'],
            age: ['18+', '-18']
        }
    };
}

async function updateServerConfig(guildId, newConfig) {
    const settings = await loadData('botSettings.json', {
        guildsSettings: {}
    });

    settings.guildsSettings[guildId] = {
        ...settings.guildsSettings[guildId],
        ...newConfig
    };

    await saveData('botSettings.json', settings);
    return settings.guildsSettings[guildId];
}

module.exports = {
    getServerConfig,
    updateServerConfig
};
