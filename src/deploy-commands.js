const { REST, Routes } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

async function deployCommands() {
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFolders = await fs.readdir(commandsPath);

        console.log('Empezando a cargar comandos...');

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

            console.log(`📁 Procesando carpeta: ${folder}`);
            let folderCommandCount = 0;

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                // Limpiar caché del comando
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                try {
                    if ('data' in command && 'execute' in command) {
                        const commandData = command.data.toJSON();
                        commands.push(commandData);
                        console.log(`✅ Comando añadido: ${command.data.name} desde ${folder}/${file}`);
                        folderCommandCount++;
                    } else {
                        console.warn(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas`);
                    }
                } catch (error) {
                    console.error(`❌ Error al procesar comando ${file}:`, error);
                }
            }

            console.log(`📊 Total comandos en ${folder}: ${folderCommandCount}`);
        }

        const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

        console.log('🔄 Empezando a actualizar comandos de aplicación (/)...');
        console.log(`📋 Lista de comandos a registrar:`, commands.map(cmd => cmd.name));

        try {
            await rest.put(
                Routes.applicationCommands(process.env.BOT_CLIENT_ID),
                { body: commands },
            );

            console.log('✅ ¡Comandos de aplicación (/) actualizados exitosamente!');
            console.log(`📊 Total de comandos registrados: ${commands.length}`);
            console.log('📋 Comandos registrados:', commands.map(cmd => cmd.name).join(', '));
        } catch (error) {
            console.error('❌ Error al registrar comandos en Discord:', error);
            if (error.code === 50035) {
                console.error('⚠️ Error de validación de comandos. Revisa la estructura de los comandos.');
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