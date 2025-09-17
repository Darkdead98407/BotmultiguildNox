// src/events/interactionCreate.js
const { Events } = require('discord.js');
const colorSelection = require('../modules/colorSelection.js');
const ticketSystem = require('../modules/ticketSystem.js');
const verificationSystem = require('../modules/verificationSystem.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // Slash commands
      if (typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      // Menús de selección
      if (typeof interaction.isStringSelectMenu === 'function' && interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select-color') {
          await colorSelection.handleSelectMenu(interaction);
        }
        return;
      }

      // Botones
      if (typeof interaction.isButton === 'function' && interaction.isButton()) {
        if (!interaction.customId) return;
        const [type, action, ...params] = interaction.customId.split('_');

        switch (type) {
          case 'color':
            await colorSelection.handleButton(interaction, action, params);
            break;
          case 'ticket':
            await ticketSystem.handleButton(interaction, action, params);
            break;
          case 'verify':
            await verificationSystem.handleButton(interaction, action, params);
            break;
          default:
            // botón desconocido → lo ignoramos
            break;
        }
        return;
      }

      // Si llega aquí, era otro tipo de interacción (ej: modals) que no manejamos
    } catch (error) {
      console.error('Error handling interaction:', error);
      const reply = {
        content: 'Hubo un error al procesar esta interacción.',
        ephemeral: true,
      };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(reply);
        } else if (typeof interaction.reply === 'function') {
          await interaction.reply(reply);
        }
      } catch (err) {
        console.error('Error enviando respuesta de error:', err);
      }
    }
  },
};
