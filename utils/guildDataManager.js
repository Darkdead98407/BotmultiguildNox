const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GUILD_CONFIG_FILE = id => path.join(DATA_DIR, `guild_${id}.json`);

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

async function getGuildConfig(guildId) {
    await ensureDataDir();
    try {
        const data = await fs.readFile(GUILD_CONFIG_FILE(guildId), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function setGuildConfig(guildId, config) {
    await ensureDataDir();
    await fs.writeFile(
        GUILD_CONFIG_FILE(guildId),
        JSON.stringify(config, null, 2),
        'utf8'
    );
}

module.exports = {
    getGuildConfig,
    setGuildConfig
};
