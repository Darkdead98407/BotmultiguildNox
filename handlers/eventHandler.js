const fs = require('fs').promises;
const path = require('path');

async function loadEvents(client) {
    // Asegurar que solo se carguen eventos de src/events
    const eventsPath = path.join(__dirname, '../events');

    // Verificar que el directorio existe
    try {
        await fs.access(eventsPath);
    } catch (error) {
        console.error('❌ Error: El directorio de eventos no existe:', eventsPath);
        return;
    }

    // Obtener solo archivos .js del directorio de eventos
    const eventFiles = (await fs.readdir(eventsPath))
        .filter(file => file.endsWith('.js') && !file.includes('.test.') && !file.includes('.spec.'));


    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);

            if (!event.name || typeof event.execute !== 'function') {
                console.warn(`⚠️ Advertencia: El evento en ${filePath} está mal formado. Debe exportar 'name' y 'execute'.`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(client, ...args));
            }

            console.log(`✅ Evento cargado: ${event.name} desde ${file}`);
        } catch (error) {
            console.error(`❌ Error al cargar el evento ${file}:`, error);
        }
    }
    
}

module.exports = { loadEvents };