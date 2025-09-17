const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const animeActions = require('anime-actions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Realiza acciones de anime')
        .addSubcommand(subcommand =>
            subcommand.setName('hug').setDescription('Da un abrazo a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien abrazar').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('kiss').setDescription('Da un beso a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien besar').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('pat').setDescription('Acaricia a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien acariciar').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('punch').setDescription('Golpea a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien golpear').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('slap').setDescription('Da una bofetada a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien dar una bofetada').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('bite').setDescription('Muerde a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien morder').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('bonk').setDescription('Da un golpe en la cabeza a alguien')
                .addUserOption(option => option.setName('usuario').setDescription('Usuario a quien dar un golpe').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('cry').setDescription('Muestra que estás llorando'))
        .addSubcommand(subcommand =>
            subcommand.setName('dance').setDescription('Baila de felicidad'))
        .addSubcommand(subcommand =>
            subcommand.setName('help').setDescription('Muestra la lista de comandos disponibles')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Si es help, mostrar la lista de comandos
        if (subcommand === 'help') {
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎭 Comandos de Anime Disponibles')
                .setDescription('Lista de todos los comandos de anime y sus descripciones:')
                .addFields([
                    { name: '!hug', value: '¡Da un abrazo cálido y reconfortante! 🤗', inline: true },
                    { name: '!kiss', value: '¡Comparte un dulce beso! 💋', inline: true },
                    { name: '!pat', value: '¡Da unas palmaditas cariñosas! 🤚', inline: true },
                    { name: '!punch', value: '¡Dale un puñetazo anime style! 👊', inline: true },
                    { name: '!slap', value: '¡Una bofetada con todo el poder! ✋', inline: true },
                    { name: '!bite', value: '¡Muerde juguetonamente! 😬', inline: true },
                    { name: '!bonk', value: '¡Dale un golpecito en la cabeza! 🔨', inline: true },
                    { name: '!cry', value: '¡Muestra tus lágrimas anime! 😢', inline: true },
                    { name: '!dance', value: '¡Baila de felicidad! 💃', inline: true }
                ])
                .setFooter({ text: 'Usa estos comandos con el prefijo ! o como comandos slash /' })
                .setTimestamp();

            return await interaction.reply({ embeds: [embed] });
        }

        try {
            let url;

            // Si es un comando que no requiere usuario
            if (subcommand === 'cry' || subcommand === 'dance') {
                url = await animeActions[subcommand]();
                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setDescription(`${interaction.user} ${getActionText(subcommand)}`)
                    .setImage(url)
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed] });
            }

            // Para comandos que requieren usuario
            const target = interaction.options.getUser('usuario');
            url = await animeActions[subcommand]();

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setDescription(`${interaction.user} ${getActionText(subcommand)} ${target}${getSuffix(subcommand)}`)
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
        slap: 'abofetea a',
        bite: 'muerde a',
        bonk: 'le da un golpe en la cabeza a',
        cry: 'está llorando',
        dance: 'está bailando'
    };
    return actions[action] || 'interactúa con';
}

function getSuffix(action) {
    const suffixes = {
        hug: '!',
        kiss: '!',
        pat: '!',
        punch: '!',
        slap: '!',
        bite: '!',
        bonk: '!'
    };
    return suffixes[action] || '';
}