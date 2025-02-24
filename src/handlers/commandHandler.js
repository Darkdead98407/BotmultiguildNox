const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFolders = await fs.readdir(commandsPath);

    // Limpiar comandos existentes
    client.commands.clear();

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(folderPath, file);
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`Loaded command: ${command.data.name} from ${file}`);
                } else {
                    console.warn(`Command at ${filePath} is missing required properties`);
                }
            } catch (error) {
                console.error(`Error loading command from ${file}:`, error);
            }
        }
    }
}

module.exports = { loadCommands };