const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('✨Descarga el Avatar del usuario que selecciones')
        .setDMPermission(false)
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('👤 Menciona al usuario del que quieres ver la Información.')
            .setRequired(false))
        .addStringOption(option => option
            .setName('id')
            .setDescription('🔑 Introduce la ID del usuario si ya no está en el servidor.')
            .setRequired(false))
        .addStringOption(option => option
            .setName('nombre')
            .setDescription('✍️ Si no sabes la ID, busca por nombre (solo en este servidor).')
            .setRequired(false))
        .addBooleanOption(option => option
            .setName('servidor')
            .setDescription('🏢 ¿Mostrar el avatar específico de este servidor?')
            .setRequired(false))
        .addStringOption(option => option
            .setName('formato')
            .setDescription('🖼️ Elige en qué formato quieres descargar el avatar.')
            .addChoices(
                { name: 'PNG (Buena calidad)', value: 'png' },
                { name: 'JPG (Tamaño pequeño)', value: 'jpg' },
                { name: 'WEBP (Formato moderno)', value: 'webp' },
                { name: 'GIF (Animado, si lo es)', value: 'gif' }
            )
            .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const { client, guild } = interaction;
        const userOption = interaction.options.getUser('usuario');
        const idOption = interaction.options.getString('id');
        const nameOption = interaction.options.getString('nombre');
        const serverAvatar = interaction.options.getBoolean('servidor');

        let user;

        if (userOption) user = userOption;
        else if (idOption) {
            try {
                user = await client.users.fetch(idOption);
            } catch (error) {
                return await interaction.editReply('❌ No encontré un usuario con esa ID.');
            }
        } else if (nameOption) {
            const members = await guild.members.fetch({ query: nameOption, limit: 1 });
            user = members.first()?.user;
            if (!user) {
                return await interaction.editReply('🤔 No encontré a nadie con ese nombre aquí.');
            }
        } else {
            user = interaction.user;
        }

        const avatarURL = serverAvatar && guild.members.cache.get(user.id)?.avatar
            ? user.guildAvatarURL({ size: 4096, dynamic: true })
            : user.displayAvatarURL({ size: 4096, dynamic: true });

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`🖼️ Avatar de ${user.username}`)
            .setImage(avatarURL)
            .setTimestamp()
            .setFooter({
                text: `Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('PNG')
                .setStyle(ButtonStyle.Link)
                .setURL(user.displayAvatarURL({ size: 4096, format: 'png' })),
            new ButtonBuilder()
                .setLabel('JPG')
                .setStyle(ButtonStyle.Link)
                .setURL(user.displayAvatarURL({ size: 4096, format: 'jpg' })),
            new ButtonBuilder()
                .setLabel('WEBP')
                .setStyle(ButtonStyle.Link)
                .setURL(user.displayAvatarURL({ size: 4096, format: 'webp' }))
        );

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },
};
