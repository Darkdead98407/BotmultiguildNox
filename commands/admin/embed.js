const { 
    SlashCommandBuilder, 
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { hasPermission } = require('../../utils/permissionsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crear un embed en un canal específico')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Selecciona un canal')
                .setRequired(true)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const member = interaction.member;

        if (!hasPermission(guildId, member, 'admin') && !hasPermission(guildId, member, 'dev')) {
            return interaction.reply({ 
                content: 'No tienes permiso para usar este comando.',
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('canal');

        if (!channel.permissionsFor(interaction.client.user).has('EMBED_LINKS')) {
            return interaction.reply({
                content: 'No tengo permiso para enviar embeds en ese canal.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('embed-modal')
            .setTitle('Crear Embed')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('title')
                        .setLabel('Título del Embed')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descripción del Embed')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('color')
                        .setLabel('Color del Embed (HEX)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setValue('#0099ff')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('image')
                        .setLabel('URL de la imagen')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('footer')
                        .setLabel('Texto del pie de página')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                )
            );

        await interaction.showModal(modal);

        const filter = (i) => i.customId === 'embed-modal' && i.user.id === interaction.user.id;
        const submission = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(() => null);

        if (submission) {
            const embed = new EmbedBuilder()
                .setColor(submission.fields.getTextInputValue('color'))
                .setDescription(submission.fields.getTextInputValue('description'));

            const title = submission.fields.getTextInputValue('title');
            const image = submission.fields.getTextInputValue('image');
            const footer = submission.fields.getTextInputValue('footer');

            if (title) embed.setTitle(title);
            if (image) embed.setImage(image);
            if (footer) embed.setFooter({ text: footer });

            await channel.send({ embeds: [embed] });
            await submission.reply({ content: 'Embed enviado correctamente.', ephemeral: true });
        }
    }
};
