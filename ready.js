const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            // Import required modules
            const chalk = await import('chalk').then(m => m.default);
            const gradient = await import('gradient-string').then(m => m.default);
            const figlet = await import('figlet').then(m => m.default);
            const boxen = await import('boxen').then(m => m.default);

            // Set bot username
            await client.user.setUsername("Nox✅");

            // Set bot activity
            client.user.setActivity("Bot en programación, nos vemos pronto ❤️", {
                type: ActivityType.Custom
            });

            // Generate fancy console output
            figlet.text(client.user.username, {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (err) {
                    console.error('Error generating title:', err);
                    return;
                }

                const title = gradient.rainbow(data);
                console.log(title);

                // Display bot information
                const info = `
                    🤖 ${chalk.green.bold('Bot Name:')} ${chalk.cyan.bold(client.user.tag)}
                    🟢 ${chalk.green.bold('Status:')} ${chalk.blue.bold(client.presence?.status || "Unknown")}
                    💻 ${chalk.green.bold('Servers:')} ${chalk.yellow.bold(client.guilds.cache.size)}
                    👥 ${chalk.green.bold('Users:')} ${chalk.magenta.bold(client.users.cache.size)}
                `;

                const welcome = boxen(info, {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'double',
                    borderColor: 'cyan',
                    backgroundColor: '#333'
                });

                console.log(welcome);

                // Additional message
                console.log(gradient.rainbow(`
                    ¡Bot is ready and running!
                    Thank you for using this bot! 🚀
                `));
            });

        } catch (error) {
            console.error('Error in ready event:', error);
        }
    }
};
