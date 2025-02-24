const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat-gpt')
        .setDescription('Gestiona el sistema de Chat IA')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Establece o actualiza el chat IA')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal del Chat IA')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Desactiva el Chat IA')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            switch (subcommand) {
                case 'setup': {
                    const channel = interaction.options.getChannel('canal');
                    const guildConfig = await getGuildConfig(guildId) || {};
                    
                    guildConfig.chatChannel = channel.id;
                    await setGuildConfig(guildId, guildConfig);

                    await interaction.reply({
                        content: `✅ Sistema de Chat IA establecido en ${channel}`,
                        ephemeral: true
                    });
                    break;
                }
                case 'delete': {
                    const guildConfig = await getGuildConfig(guildId);
                    
                    if (guildConfig && guildConfig.chatChannel) {
                        delete guildConfig.chatChannel;
                        await setGuildConfig(guildId, guildConfig);
                    }

                    await interaction.reply({
                        content: '✅ Sistema de Chat IA desactivado correctamente.',
                        ephemeral: true
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Error en comando chat-gpt:', error);
            await interaction.reply({
                content: '❌ Ocurrió un error al procesar el comando.',
                ephemeral: true
            });
        }
    }
};
