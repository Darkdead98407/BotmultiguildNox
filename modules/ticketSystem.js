const { 
    EmbedBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

const ticketData = new Map();

    async function handleButton(interaction, action, params) {
        const config = interaction.client.config.ticketSystem;

        switch (action) {
            case 'create':
                await createTicket(interaction, config);
                break;
            case 'claim':
                await claimTicket(interaction, config);
                break;
            case 'close':
                await closeTicket(interaction, config);
                break;
        }
    };

async function createTicket(interaction, config) {
    const existingTicket = interaction.guild.channels.cache.find(
        channel => channel.name === `ticket-${interaction.user.id}`
    );

    if (existingTicket) {
        return interaction.reply({
            content: 'Ya tienes un ticket abierto.',
            ephemeral: true
        });
    }

    const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        parent: config.categoryId,
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            },
            {
                id: interaction.guild.roles.cache.get(config.supportRoleId),
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
        ],
    });

    ticketData.set(channel.id, {
        opener: interaction.user.id,
        claimedBy: null,
        claimedAt: null,
    });

    const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Cerrar Ticket')
        .setStyle(ButtonStyle.Danger);

    const claimButton = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Reclamar Ticket')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

    const embed = new EmbedBuilder()
        .setTitle('Nuevo Ticket')
        .setDescription('Un nuevo ticket ha sido creado. Espera a que un miembro del staff te atienda.')
        .addFields({ name: 'Usuario', value: `${interaction.user}` })
        .setColor('#00AE86');

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
        content: `✅ Se ha creado tu ticket en ${channel}.`,
        ephemeral: true
    });
}

async function claimTicket(interaction, config) {
    if (!interaction.member.roles.cache.has(config.supportRoleId)) {
        return interaction.reply({
            content: '❌ No tienes permiso para reclamar tickets.',
            ephemeral: true
        });
    }

    const ticket = ticketData.get(interaction.channel.id);
    if (!ticket) return;

    ticket.claimedBy = interaction.user.id;
    ticket.claimedAt = Date.now();
    ticketData.set(interaction.channel.id, ticket);

    const embed = new EmbedBuilder()
        .setTitle('Ticket Reclamado')
        .setDescription(`Ticket reclamado por ${interaction.user}`)
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function closeTicket(interaction, config) {
    const ticket = ticketData.get(interaction.channel.id);
    if (!ticket) return;

    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setTitle('Ticket Cerrado')
            .setDescription(`
                Abierto por: <@${ticket.opener}>
                ${ticket.claimedBy ? `Reclamado por: <@${ticket.claimedBy}>` : 'No reclamado'}
                Cerrado por: ${interaction.user}
            `)
            .setColor('#ff0000')
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    }

    await interaction.reply('El ticket se cerrará en 5 segundos...');
    setTimeout(() => interaction.channel.delete(), 5000);
}

module.exports = {
    handleButton,
    createTicket,
    claimTicket,
    closeTicket,
};
