const { 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle 
} = require('discord.js');

async function handleButton(interaction, action, params) {
    if (action === 'start') {
        await startVerification(interaction);
    } else if (action === 'answer') {
        await checkAnswer(interaction, params[0]);
    }
}

async function startVerification(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('Verificación')
        .setDescription('¿Cuál es la capital de Francia?')
        .setColor('#00AE86');

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_answer_0')
                .setLabel('Londres')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('verify_answer_1')
                .setLabel('París')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('verify_answer_2')
                .setLabel('Madrid')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('verify_answer_3')
                .setLabel('Berlín')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [buttons],
        ephemeral: true
    });
}

async function checkAnswer(interaction, answer) {
    const config = interaction.client.config;
    const correctAnswer = '1'; // París

    if (answer === correctAnswer) {
        try {
            // Remove verification role
            const verificationRole = interaction.guild.roles.cache.get(config.roles.verified);
            if (verificationRole) {
                await interaction.member.roles.remove(verificationRole);
            }

            // Add user role
            const userRole = interaction.guild.roles.cache.get(config.roles.user);
            if (userRole) {
                await interaction.member.roles.add(userRole);
            }

            await interaction.reply({
                content: '✅ ¡Verificación completada! Bienvenido al servidor.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in verification:', error);
            await interaction.reply({
                content: 'Hubo un error en la verificación. Contacta a un administrador.',
                ephemeral: true
            });
        }
    } else {
        await interaction.reply({
            content: '❌ Respuesta incorrecta. Inténtalo de nuevo.',
            ephemeral: true
        });
    }
}

module.exports = {
    handleButton,
    startVerification,
    checkAnswer,
};