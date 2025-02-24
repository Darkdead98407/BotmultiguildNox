const { Events, InteractionType } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction);
            }

            // Handle context menu commands
            else if (interaction.isContextMenuCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) return;

                if (command.contextMenuExecute) {
                    await command.contextMenuExecute(interaction);
                }
            }

            // Handle button interactions
            else if (interaction.isButton()) {
                const [type, action, ...params] = interaction.customId.split('_');

                switch (type) {
                    case 'ticket':
                        require('./ticketSystem').handleButton(interaction, action, params);
                        break;
                    case 'verify':
                        require('./verificationSystem').handleButton(interaction, action, params);
                        break;
                    case 'color':
                        require('./colorSystem').handleButton(interaction, action, params);
                        break;
                }
            }

            // Handle select menus
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'select-color') {
                    require('./colorSystem').handleSelectMenu(interaction);
                }
            }

            // Handle modals
            else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'embed-modal') {
                    const command = interaction.client.commands.get('embed');
                    if (command) {
                        await command.handleModal(interaction);
                    }
                }
            }

        } catch (error) {
            console.error('Error handling interaction:', error);
            const reply = {
                content: 'Hubo un error al procesar esta interacción.',
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
};
