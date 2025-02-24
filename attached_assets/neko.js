const fetch = require('node-fetch');

module.exports = {
    name: 'hmtai',
    execute(message, args, client) {
        // Verificar si se proporcionó una categoría
        if (args.length === 0) {
            return message.reply('Debes especificar una categoría. Ejemplo: `!hmtai neko`');
        }

        const category = args[0].toLowerCase(); // Convertir la categoría a minúsculas

        // Definir las categorías disponibles
        const categories = {
            // Categorías SFW
            neko: 'https://hmtai.hatsunia.cfd/v2/sfw/neko',
            waifu: 'https://hmtai.hatsunia.cfd/v2/sfw/waifu',
            kitsune: 'https://hmtai.hatsunia.cfd/v2/sfw/kitsune',
            wave: 'https://hmtai.hatsunia.cfd/v2/sfw/wave',
            wink: 'https://hmtai.hatsunia.cfd/v2/sfw/wink',
            // Agrega más categorías SFW según sea necesario

            // Categorías NSFW
            hentai: 'https://hmtai.hatsunia.cfd/v2/nsfw/hentai',
            ass: 'https://hmtai.hatsunia.cfd/v2/nsfw/ass',
            bdsm: 'https://hmtai.hatsunia.cfd/v2/nsfw/bdsm',
            // Agrega más categorías NSFW según sea necesario
        };

        // Verificar si la categoría existe
        if (!categories[category]) {
            return message.reply(`Categoría no válida. Categorías disponibles: ${Object.keys(categories).join(', ')}`);
        }

        // Verificar si la categoría es NSFW y si el canal es NSFW
        if (category === 'hentai' || category === 'ass' || category === 'bdsm') {
            if (!message.channel.nsfw) {
                return message.reply('Esta categoría solo puede usarse en canales NSFW.');
            }
        }

        // Obtener la imagen de la API
        fetch(categories[category])
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error en la solicitud: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.url) {
                    throw new Error('No se encontró la URL de la imagen en la respuesta.');
                }
                message.channel.send(data.url);
            })
            .catch(error => {
                console.error(`Error al obtener la imagen de ${category}:`, error);
                message.reply(`Hubo un error al obtener la imagen de ${category}.`);
            });
    },
};