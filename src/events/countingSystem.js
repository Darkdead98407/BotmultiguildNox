const { Events, EmbedBuilder } = require('discord.js');
const pool = require('../database/db');

// Store counting data
const countingData = {
    nextNumber: 1,
    lastUser: null,
    rewards: {
        50: 100,   // 100 coins al llegar a 50
        100: 500,  // 500 coins al llegar a 100
        200: 1000  // 1000 coins al llegar a 200
    }
};

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Check if message is in counting channel
        if (message.channel.id !== message.client.config.channels.counting) return;

        // Ignore bot messages
        if (message.author.bot) return;

        const number = parseInt(message.content);

        // If message is not a number, delete it
        if (isNaN(number)) {
            await message.delete().catch(console.error);
            return;
        }

        // Check if number is correct
        if (number === countingData.nextNumber) {
            // Check if same user is counting
            if (message.author.id === countingData.lastUser) {
                await message.delete();
                await message.channel.send('¡No puedes contar dos números seguidos!');
                return;
            }

            // Add reaction and update counter
            await message.react('👍');
            countingData.nextNumber++;
            countingData.lastUser = message.author.id;

            // Check for rewards
            if (countingData.rewards[number]) {
                const reward = countingData.rewards[number];
                try {
                    // Update economy in database
                    await pool.query(
                        'UPDATE discord_economy SET noxcoins = noxcoins + $1 WHERE discord_id = $2',
                        [reward, message.author.id]
                    );

                    // Send reward message
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🎉 ¡Recompensa Especial!')
                        .setDescription(`¡Felicidades ${message.author}! Has ganado **${reward} NoxCoins** por llegar al número **${number}**`)
                        .setFooter({ text: '¡Sigue participando!' })
                        .setTimestamp();

                    await message.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Error giving reward:', error);
                }
            }
        } else {
            // Wrong number
            await message.reply(`❌ ¡Número incorrecto! El siguiente número era **${countingData.nextNumber}**. Empezamos de nuevo.`);

            // Reset counting
            countingData.nextNumber = 1;
            countingData.lastUser = null;

            // Clear channel
            try {
                const messages = await message.channel.messages.fetch({ limit: 100 });
                await message.channel.bulkDelete(messages);
            } catch (error) {
                console.error('Error clearing counting channel:', error);
            }
        }
    }
};