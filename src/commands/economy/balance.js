const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Muestra tu saldo de Coins'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const discordId = interaction.user.id;

        try {
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [discordId]);

            if (syncRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Error')
                    .setDescription('No has vinculado tu cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftUuid = syncRows[0].minecraft_uuid;
            const [minecraftBalanceRows] = await pool.query('SELECT balance FROM xconomy WHERE UID = ?', [minecraftUuid]);

            if (minecraftBalanceRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Error')
                    .setDescription('No se encontró tu saldo en la base de datos de Minecraft.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftBalance = minecraftBalanceRows[0].balance;
            await pool.query('UPDATE discord_economy SET coins = ? WHERE discord_id = ?', [minecraftBalance, discordId]);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Saldo de Coins')
                .setDescription(`Tu saldo de Coins es: **${minecraftBalance}**`);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('Hubo un error al obtener tu saldo.');
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
