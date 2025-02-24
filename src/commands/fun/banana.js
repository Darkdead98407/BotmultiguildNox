const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banana')
        .setDescription('Mira cuánto te mide.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario')
                .setRequired(false)),

    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario') || interaction.user;
        const banana = Math.floor(Math.random() * 30);

        const embed = new EmbedBuilder()
            .setDescription(`**La banana de ${usuario.username} mide ${banana} cm.**`)
            .setColor("Random")
            .setImage("https://media.giphy.com/media/1AD3TMRwXlNgk/giphy.gif");

        await interaction.reply({ embeds: [embed] });
    }
};
