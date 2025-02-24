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

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                // Limpiar caché del comando
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Comando añadido: ${command.data.name} desde ${folder}/${file}`);
                } else {
                    console.warn(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas`);
                }
            }
        }

        const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

        console.log('🔄 Empezando a actualizar comandos de aplicación (/)...');

        await rest.put(
            Routes.applicationCommands(process.env.BOT_CLIENT_ID),
            { body: commands },
        );

        console.log('✅ ¡Comandos de aplicación (/) actualizados exitosamente!');
        console.log(`📊 Total de comandos registrados: ${commands.length}`);
    } catch (error) {
        console.error('❌ Error al desplegar comandos:', error);
    }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };