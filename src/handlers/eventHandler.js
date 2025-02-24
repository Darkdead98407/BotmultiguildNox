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
        .filter(file => file.endsWith('.js'))
        .filter(file => !file.includes('.test.') && !file.includes('.spec.')); // Excluir archivos de prueba

    // Limpiar todos los eventos existentes
    const events = client.eventNames();
    console.log('🔄 Eventos actuales antes de limpiar:', events);
    console.log('📊 Cantidad de listeners messageCreate antes de limpiar:', client.listenerCount('messageCreate'));

    for (const event of events) {
        client.removeAllListeners(event);
    }

    console.log('🔄 Iniciando carga de eventos...');

    // Registro de eventos ya cargados para evitar duplicados
    const loadedEvents = new Set();

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);

        // Verificar que el archivo existe y está en el directorio correcto
        if (!filePath.startsWith(eventsPath)) {
            console.warn(`⚠️ Intento de carga de evento fuera del directorio de eventos: ${filePath}`);
            continue;
        }

        // Limpiar caché del módulo
        delete require.cache[require.resolve(filePath)];

        try {
            const event = require(filePath);
            console.log(`🔍 Intentando cargar evento desde ${file}:`, {
                eventName: event.name,
                filePath: filePath
            });

            // Validar estructura del evento
            if (!event.name || typeof event.execute !== 'function') {
                console.warn(`⚠️ Archivo de evento inválido: ${file}, se requiere name y execute`);
                continue;
            }

            // Verificar si el evento ya está registrado
            if (loadedEvents.has(event.name)) {
                console.warn(`⚠️ Evento duplicado encontrado: ${event.name} en ${file}, ignorando...`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }

            loadedEvents.add(event.name);
            console.log(`✅ Evento cargado: ${event.name} desde ${file}`);

            // Log específico para messageCreate
            if (event.name === 'messageCreate') {
                console.log(`📝 messageCreate registrado desde ${file}`);
            }
        } catch (error) {
            console.error(`❌ Error al cargar evento desde ${file}:`, error);
        }
    }

    console.log('📊 Total de eventos cargados:', loadedEvents.size);
    console.log('📊 Cantidad de listeners messageCreate después de cargar:', client.listenerCount('messageCreate'));
    console.log('📝 Lista de eventos cargados:', Array.from(loadedEvents));
}

module.exports = { loadEvents };