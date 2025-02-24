const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('waifu')
        .setDescription('Genera una imagen de waifu')
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('Categoría de la imagen')
                .setRequired(true)
                .addChoices(
                    { name: 'SFW - Normal', value: 'sfw' },
                    { name: 'NSFW - Ero', value: 'ero' },
                    { name: 'NSFW - Ecchi', value: 'ecchi' }
                )),

    async execute(interaction) {
        const categoria = interaction.options.getString('categoria');

        if (categoria !== 'sfw' && !interaction.channel.nsfw) {
            return interaction.reply({
                content: 'Las categorías NSFW solo pueden usarse en canales NSFW.',
                ephemeral: true
            });
        }

        try {
            const response = await fetch(`https://api.waifu.im/search/?included_tags=${categoria}`);
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setTitle('Hola soy tu waifu ♥️')
                .setColor('DarkButNotBlack')
                .setImage(data.images[0].url)
                .setFooter({
                    text: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            const message = await interaction.reply({
                embeds: [embed],
                fetchReply: true
            });

            await message.react('👍');
            await message.react('👎');
        } catch (error) {
            console.error('Error al obtener waifu:', error);
            await interaction.reply({
                content: 'Hubo un error al generar tu waifu.',
                ephemeral: true
            });
        }
    }
};