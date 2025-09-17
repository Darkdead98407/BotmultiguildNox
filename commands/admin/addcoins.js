const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcoins')
        .setDescription('Añade NoxCoins a un usuario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres añadir NoxCoins')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de NoxCoins a añadir')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');

        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('No tienes permisos para usar este comando.');
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [targetUser.id]);

            if (syncRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Error')
                    .setDescription('El usuario no ha vinculado su cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftUuid = syncRows[0].minecraft_uuid;

            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins + ? WHERE discord_id = ?', [amount, targetUser.id]);
            await pool.query('UPDATE xconomy SET balance = balance + ? WHERE UID = ?', [amount, minecraftUuid]);

            const [discordBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [targetUser.id]);
            const discordBalance = discordBalanceRows[0].noxcoins;

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('NoxCoins añadidos')
                .setDescription(`Se han añadido **${amount} NoxCoins** al usuario **${targetUser.username}**. Su nuevo saldo es: **${discordBalance}**`);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('Hubo un error al añadir NoxCoins.');
            await interaction.editReply({ embeds: [embed] });
        }
    },
};