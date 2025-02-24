const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const animeActions = require('anime-actions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Realiza acciones de anime')
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('Da un abrazo a alguien')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a quien abrazar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kiss')
                .setDescription('Da un beso a alguien')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a quien besar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pat')
                .setDescription('Acaricia a alguien')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a quien acariciar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('punch')
                .setDescription('Golpea a alguien')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a quien golpear')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slap')
                .setDescription('Da una bofetada a alguien')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a quien dar una bofetada')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        let url;

        try {
            switch (subcommand) {
                case 'hug':
                    url = await animeActions.hug();
                    break;
                case 'kiss':
                    url = await animeActions.kiss();
                    break;
                case 'pat':
                    url = await animeActions.pat();
                    break;
                case 'punch':
                    url = await animeActions.punch();
                    break;
                case 'slap':
                    url = await animeActions.slap();
                    break;
            }

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setDescription(`${interaction.user} ${getActionText(subcommand)} ${target}`)
                .setImage(url)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error al ejecutar el comando anime ${subcommand}:`, error);
            await interaction.reply({
                content: 'Hubo un error al ejecutar el comando.',
                ephemeral: true
            });
        }
    }
};

function getActionText(action) {
    const actions = {
        hug: 'abraza a',
        kiss: 'besa a',
        pat: 'acaricia a',
        punch: 'golpea a',
        slap: 'abofetea a'
    };
    return actions[action] || 'interactúa con';
}
