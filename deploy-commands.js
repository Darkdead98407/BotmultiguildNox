const { REST, Routes } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function deployCommands() {
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFolders = await fs.readdir(commandsPath);

        console.log('Empezando a cargar comandos...');

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));


            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                try {
                    // Limpiar caché del comando
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        const commandData = command.data.toJSON();
                        commands.push(commandData);
                    } else {
                        console.warn(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas`);
                    }
                } catch (error) {
                    console.error(`❌ Error al procesar comando ${file}:`, error);
                }
            }

        }

        const rest = new REST().setToken(process.env.TOKEN);

        console.log('🔄 Empezando a actualizar comandos de aplicación (/)...');

        try {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENTID),
                { body: commands },
            );

            console.log('✅ ¡Comandos de aplicación (/) actualizados exitosamente!');
            console.log(`📊 Total de comandos registrados: ${commands.length}`);
        } catch (error) {
            console.error('❌ Error al registrar comandos en Discord:', error);
            if (error.code === 50035) {
                console.error('⚠️ Error de validación de comandos. Revisa la estructura de los comandos.');
                console.error('Detalles del error:', error.message);
                console.error('Comando problemático:', error.rawError?.errors);
            }
        }
    } catch (error) {
        console.error('❌ Error al desplegar comandos:', error);
    }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };