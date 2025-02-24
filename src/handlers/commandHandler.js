const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFolders = await fs.readdir(commandsPath);

    // Limpiar todos los comandos existentes
    client.commands.clear();
    console.log('🔄 Iniciando carga de comandos...');

    // Registro de comandos ya cargados para evitar duplicados
    const loadedCommands = new Set();

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(folderPath, file);
                // Limpiar caché del comando
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    // Verificar si el comando ya está registrado
                    if (loadedCommands.has(command.data.name)) {
                        console.warn(`⚠️ Comando duplicado encontrado: ${command.data.name} en ${file}, ignorando...`);
                        continue;
                    }

                    client.commands.set(command.data.name, command);
                    loadedCommands.add(command.data.name);
                    console.log(`✅ Comando cargado: ${command.data.name} desde ${folder}/${file}`);
                } else {
                    console.warn(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas`);
                }
            } catch (error) {
                console.error(`❌ Error al cargar comando desde ${file}:`, error);
            }
        }
    }

    console.log(`📊 Total de comandos cargados: ${loadedCommands.size}`);
    console.log('📋 Lista de comandos:', Array.from(loadedCommands).join(', '));
}

module.exports = { loadCommands };