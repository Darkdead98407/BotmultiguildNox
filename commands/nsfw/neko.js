const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('neko')
        .setDescription('Muestra una imagen de neko')
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('Tipo de imagen')
                .setRequired(true)
                .addChoices(
                    { name: 'SFW', value: 'sfw' },
                    { name: 'NSFW', value: 'nsfw' }
                )),

    async execute(interaction) {
        const tipo = interaction.options.getString('tipo');

        if (tipo === 'nsfw' && !interaction.channel.nsfw) {
            return interaction.reply({
                content: 'Este comando solo puede usarse en canales NSFW.',
                ephemeral: true
            });
        }

        const endpoint = tipo === 'sfw' 
            ? 'https://hmtai.hatsunia.cfd/v2/sfw/neko'
            : 'https://hmtai.hatsunia.cfd/v2/nsfw/neko';

        try {
            const response = await fetch(endpoint);
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('Neko Image')
                .setImage(data.url)
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener imagen neko:', error);
            await interaction.reply({
                content: 'Hubo un error al obtener la imagen.',
                ephemeral: true
            });
        }
    }
};