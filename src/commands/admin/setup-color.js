const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasPermission } = require('../../utils/permissionsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-color')
        .setDescription('Configura el menú de selección de colores en este canal.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const member = interaction.member;

        if (!hasPermission(guildId, member, 'admin')) {
            return interaction.reply({ 
                content: 'No tienes permiso para usar este comando.',
                ephemeral: true 
            });
        }

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select-color')
                    .setPlaceholder('Elige un color')
                    .addOptions([
                        { label: 'Morado', value: 'morado' },
                        { label: 'Rojo', value: 'rojo' },
                        { label: 'Amarillo', value: 'amarillo' },
                        { label: 'Azul', value: 'azul' },
                        { label: 'Verde', value: 'verde' },
                        { label: 'Rosa', value: 'rosa' },
                        { label: 'Negro', value: 'negro' },
                        { label: 'Naranja', value: 'naranja' }
                    ])
            );

        await interaction.reply({
            content: '🎨 Selecciona un color para obtener tu rol:',
            components: [selectMenu]
        });
    }
};
