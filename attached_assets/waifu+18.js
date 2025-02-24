const { EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
    name: 'waifu', // Nombre del comando
    description: 'Genera tu waifu +18',
    usage: '!waifu <categoria>', // Ejemplo de uso
    execute(message, args, client) {
        // Verificar si se proporcionó una categoría
        if (args.length === 0) {
            return message.reply('Debes proporcionar una categoría. Usa `!waifu <categoria>`.\nCategorías disponibles: `ero`, `ass`, `hentai`, `milf`, `oral`, `paizuri`, `ecchi`.');
        }

        const type = args[0].toLowerCase(); // Obtener la categoría del primer argumento

        // Verificar si la categoría es válida
        const validCategories = ['ero', 'ass', 'hentai', 'milf', 'oral', 'paizuri', 'ecchi'];
        if (!validCategories.includes(type)) {
            return message.reply('Categoría no válida. Usa una de las siguientes: `ero`, `ass`, `hentai`, `milf`, `oral`, `paizuri`, `ecchi`.');
        }

        // Obtener la imagen de la API
        fetch(`https://api.waifu.im/search/?included_tags=${type}`)
            .then(res => res.json())
            .then(body => {
                const embed = new EmbedBuilder()
                    .setTitle('Hola soy tu waifu ♥️')
                    .setColor('DarkButNotBlack')
                    .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp()
                    .setImage(body.images[0].url);

                message.reply({ embeds: [embed] })
                    .then(replyMessage => {
                        // Añadir reacciones al mensaje
                        replyMessage.react('👍');
                        replyMessage.react('👎');
                    })
                    .catch(console.error);
            })
            .catch(error => {
                console.error('Error al obtener la waifu:', error);
                message.reply('Hubo un error al generar tu waifu. Por favor, inténtalo de nuevo más tarde.');
            });
    },
};
