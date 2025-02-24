const { SlashCommandBuilder } = require('discord.js');
const { addPermission } = require('../../utils/permissionsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addpermission')
    .setDescription('Agrega un rol de administración o desarrollo.')
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('El rol que deseas agregar.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('El tipo de permiso (admin o dev).')
        .setRequired(true)
        .addChoices(
          { name: 'Admin', value: 'admin' },
          { name: 'Dev', value: 'dev' }
        )),

  async execute(interaction) {
    const role = interaction.options.getRole('rol');
    const type = interaction.options.getString('tipo');
    const guildId = interaction.guild.id;

    // Verificar permisos del usuario que ejecuta el comando
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
    }

    // Agregar el permiso
    addPermission(guildId, role.id, type);

    await interaction.reply({ content: `El rol **${role.name}** ha sido agregado como **${type}**.`, ephemeral: true });
  }
};