const fs = require('fs').promises;
const path = require('path');

async function loadEvents(client) {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));

    // Limpiar eventos existentes
    client.removeAllListeners();

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        delete require.cache[require.resolve(filePath)];
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }

        console.log(`Loaded event: ${event.name} from ${file}`);
    }
}

module.exports = { loadEvents };