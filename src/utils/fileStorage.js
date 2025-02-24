const fs = require('fs').promises;
const path = require('path');

// Asegurar que el directorio data existe
const dataDir = path.join(__dirname, '../data');

async function ensureDataDir() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

async function saveData(filename, data) {
    await ensureDataDir();
    const filePath = path.join(dataDir, filename);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving data to ${filename}:`, error);
    }
}

async function loadData(filename, defaultData = {}) {
    await ensureDataDir();
    const filePath = path.join(dataDir, filename);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Si el archivo no existe, crear uno nuevo con los datos por defecto
            await saveData(filename, defaultData);
            return defaultData;
        }
        console.error(`Error loading data from ${filename}:`, error);
        return defaultData;
    }
}

module.exports = {
    saveData,
    loadData,
    dataDir
};
