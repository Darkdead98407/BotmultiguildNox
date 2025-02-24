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
};const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const pool = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcoins')
        .setDescription('Añade NoxCoins a un usuario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres añadir NoxCoins')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de NoxCoins a añadir')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64, });

        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');

        // Verificar permisos de administrador
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('Error')
                .setDescription('No tienes permisos para usar este comando.');
            return interaction.editReply({ embeds: [embed] });
        }

        try {
            // Verificar si el usuario está vinculado
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [targetUser.id]);

            if (syncRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('Error')
                    .setDescription('El usuario no ha vinculado su cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftUuid = syncRows[0].minecraft_uuid;

            // Actualizar el saldo en discord_economy
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins + ? WHERE discord_id = ?', [amount, targetUser.id]);

            // Actualizar el saldo en xconomy
            await pool.query('UPDATE xconomy SET balance = balance + ? WHERE UID = ?', [amount, minecraftUuid]);

            // Obtener el saldo actualizado de discord_economy
            const [discordBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [targetUser.id]);

            const discordBalance = discordBalanceRows[0].noxcoins;

            // Responder con el saldo actualizado
            const embed = new EmbedBuilder()
                .setColor(0x00FF00) // Verde
                .setTitle('NoxCoins añadidos')
                .setDescription(`Se han añadido **${amount} NoxCoins** al usuario **${targetUser.username}**. Su nuevo saldo es: **${discordBalance}**`);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('Error')
                .setDescription('Hubo un error al añadir NoxCoins.');
            await interaction.editReply({ embeds: [embed] });
        }
    },
};const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('✨Descarga el Avatar del usuario que selecciones')
        .setDMPermission(false)
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('👤 Menciona al usuario del que quieres ver la Imformacion. 👇')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('id')
            .setDescription('🔑 Introduce la ID del usuario si ya no está en el servidor. 👻')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('nombre')
            .setDescription('✍️ Si no sabes la ID, busca por nombre (solo en este servidor). 🔎')
            .setRequired(false)
        )
        .addBooleanOption(option => option
            .setName('servidor')
            .setDescription('🏢 ¿Mostrar el avatar específico de este servidor? (Si lo tiene).')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('formato')
            .setDescription('🖼️ Elige en qué formato quieres descargar el avatar. 👇')
            .addChoices(
                { name: 'PNG (Buena calidad)', value: 'png' },
                { name: 'JPG (Tamaño pequeño)', value: 'jpg' },
                { name: 'JPEG (Similar a JPG)', value: 'jpeg' },
                { name: 'GIF (Animado, si lo es)', value: 'gif' },
                { name: 'WEBP (Formato moderno)', value: 'webp' },
            )
            .setRequired(false)
        ),
    contextMenu: new ContextMenuCommandBuilder()
        .setName('Ver Avatar')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        await interaction.deferReply();

        const { client, member, guild } = interaction;
        const userOption = interaction.options.getUser('usuario');
        const idOption = interaction.options.getString('id');
        const nameOption = interaction.options.getString('nombre');
        const serverAvatar = interaction.options.getBoolean('servidor');
        const formatOption = interaction.options.getString('formato');

        let user;

        if (userOption) user = userOption;
        else if (idOption) {
            try {
                user = await client.users.fetch(idOption);
            } catch (error) {
                return await interaction.editReply({ content: '❌ ¡Oops! No encontré un usuario con esa ID. 🧐' });
            }
        } else if (nameOption) {
            const members = await guild.members.fetch({ query: nameOption, limit: 1 });
            user = members.first()?.user;
            if (!user) {
                return await interaction.editReply({ content: '🤔 No encontré a nadie con ese nombre aquí. 🤷' });
            }
        } else {
            user = member.user;
        }

        const avatarURLMethod = serverAvatar && guild.members.cache.get(user.id)?.avatar ? 'guildAvatarURL' : 'displayAvatarURL';
        const avatarURL = user[avatarURLMethod]({ size: 4096, dynamic: true });
        const isAnimated = avatarURL?.endsWith('.gif');
        const avatarFormat = isAnimated ? 'GIF animado 🎬' : 'Imagen estática 🖼️';

        const embedAvatar = new EmbedBuilder()
            .setColor('#2ecc71') // Un verde brillante y claro 🟢
            .setTitle(`🖼️ ¡Mira el avatar de ${user.username}${user.discriminator !== '0' ? `#${user.discriminator}` : ''}! ✨`)
            .setDescription(`Aquí está el avatar de **${user.username}**. 👇`)
            .setThumbnail(user.displayAvatarURL({ size: 64, dynamic: true }))
            .setImage(avatarURL)
            .addFields(
                { name: 'ℹ️ Información del usuario', value: `**Nombre:** ${user.username}\n**ID:** ${user.id}\n**¿Es un bot?:** ${user.bot ? 'Sí 🤖' : 'No 👤'}` },
                { name: '🔗 Descargas directas:', value: `[PNG](${user.displayAvatarURL({ size: 4096, format: 'png' })}) | [JPG](${user.displayAvatarURL({ size: 4096, format: 'jpg' })}) | [WEBP](${user.displayAvatarURL({ size: 4096, format: 'webp' })}) ${isAnimated ? `| [GIF](${user.displayAvatarURL({ size: 4096, format: 'gif' })})` : ''}` },
                { name: '📅 Cuenta creada el:', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R> relativa)` },
                // Eliminamos el campo experimental para simplificar
            )
            .setTimestamp()
            .setFooter({
                text: `🌟 ¡Avatar mostrado con claridad! | Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }),
            });

        const buttonsRow = new ActionRowBuilder();
        const formats = ['png', 'jpg', 'webp'];
        if (isAnimated) formats.push('gif');

        formats.forEach(format => {
            buttonsRow.addComponents(
                new ButtonBuilder()
                    .setLabel(`⬇️ ${format.toUpperCase()}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 4096, format })),
            );
        });

        buttonsRow.addComponents(
            new ButtonBuilder()
                .setLabel('👤 Ver Perfil')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/users/${user.id}`),
        );

        await interaction.editReply({
            content: '¡Aquí tienes el avatar, clarito y con opciones! 👇',
            embeds: [embedAvatar],
            components: [buttonsRow],
        });
    },
    async contextMenuExecute(interaction) {
        const user = await interaction.client.users.fetch(interaction.targetId);
        const avatarURL = user.displayAvatarURL({ size: 4096, dynamic: true });
        const isAnimated = avatarURL.endsWith('.gif');

        const embed = new EmbedBuilder()
            .setColor('#f1c40f') // Un amarillo alegre 🟡
            .setTitle(`🖼️ ¡Avatar de ${user.tag} (Clic derecho)! ✨`)
            .setImage(avatarURL)
            .setFooter({ text: `Pedido desde el menú contextual` });

        const buttonsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('⬇️ PNG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 4096, format: 'png' })),
                new ButtonBuilder()
                    .setLabel('⬇️ JPG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 4096, format: 'jpg' })),
                new ButtonBuilder()
                    .setLabel('👤 Perfil')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/users/${user.id}`),
            );

        if (isAnimated) {
            buttonsRow.components.push(
                new ButtonBuilder()
                    .setLabel('⬇️ GIF')
                    .setStyle(ButtonStyle.Link)
                    .setURL(user.displayAvatarURL({ size: 4096, format: 'gif' }))
            );
        }

        await interaction.reply({
           embeds: [embed],
           components: [buttonsRow],
           flags: 64});
    },
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Muestra tu saldo de Coins'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // Respuesta diferida

        const discordId = interaction.user.id;

        try {
            // Verificar si el usuario está vinculado
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [discordId]);

            if (syncRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('Error')
                    .setDescription('No has vinculado tu cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftUuid = syncRows[0].minecraft_uuid;

            // Obtener el saldo de Minecraft desde xconomy
            const [minecraftBalanceRows] = await pool.query('SELECT balance FROM xconomy WHERE UID = ?', [minecraftUuid]);

            if (minecraftBalanceRows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('Error')
                    .setDescription('No se encontró tu saldo en la base de datos de Minecraft.');
                return interaction.editReply({ embeds: [embed] });
            }

            const minecraftBalance = minecraftBalanceRows[0].balance;

            // Actualizar el saldo en discord_economy
            await pool.query('UPDATE discord_economy SET coins = ? WHERE discord_id = ?', [minecraftBalance, discordId]);

            // Obtener el saldo actualizado de discord_economy
            const [discordBalanceRows] = await pool.query('SELECT coins FROM discord_economy WHERE discord_id = ?', [discordId]);

            const discordBalance = discordBalanceRows[0].coins;

            // Responder con el saldo sincronizado
            const embed = new EmbedBuilder()
                .setColor(0x00FF00) // Verde
                .setTitle('Saldo de Coins')
                .setDescription(`Tu saldo de Coins es: **${discordBalance}**`);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('Error')
                .setDescription('Hubo un error al obtener tu saldo.');
            await interaction.editReply({ embeds: [embed] });
        }
    },
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('banana')
    .setDescription('Mira cuánto te mide.')
    .addUserOption(option =>
              option.setName('usuario')
                  .setDescription('Usuario')
                  .setRequired(false)
    ),
    
  
    execute(interaction) {
        const { options } = interaction;
        const usuario = interaction.options.getUser('usuario') || interaction.user
        const banana = [Math.floor(Math.random() * 30)]
      
        const embed = new EmbedBuilder()
        .setDescription(`**La banana de ${usuario.username} mide ${banana} cm.**`)
        .setColor("Random")
        .setImage("https://media.giphy.com/media/1AD3TMRwXlNgk/giphy.gif")


        interaction.reply({ embeds: [embed]})
    }
};
// comando creado por Joako_85#3484const { SlashCommandBuilder } = require('discord.js');
const { hasPermission } = require('../../utils/permissionsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('borrar_mensajes')
    .setDescription('Borra los mensajes de un canal.'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Verificar permisos
    if (!hasPermission(guildId, member, 'admin')) {
      return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
    }

    if (!interaction.member.permissions.has('MANAGE_MESSAGES')) {
      return interaction.reply('No tienes permiso para realizar esta acción.');
    }

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    await interaction.channel.bulkDelete(messages);
    await interaction.reply('¡Mensajes borrados!');
  }
};
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borrar_mensajes') // Cambia el nombre del comando
        .setDescription('Borra los mensajes de un canal'),
    async execute(interaction) {

        const roleId = '1328557869599297591'; // Reemplaza con el ID del rol
        const member = interaction.member;

        // Verifica si el miembro tiene el rol
        if (!member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        if (!interaction.member.permissions.has('MANAGE_MESSAGES')) {
            return interaction.reply('No tienes permiso para realizar esta acción.');
        }

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        await interaction.channel.bulkDelete(messages);
        await interaction.reply('¡Mensajes borrados!');
    },
};

const {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { getGuildConfig, setGuildConfig } = require("../../utils/guildDataManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chat-gpt")
    .setDescription("Gestiona el sistema de Chat IA")
    .addSubcommand((command) =>
      command
        .setName("setup")
        .setDescription("Establece o actualiza el chat IA")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Canal del Chat IA")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((command) =>
      command.setName("delete").setDescription("Desactiva el Chat IA")
    ),

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: `❌ No tienes permisos de \`Administrador\` para usar este comando en este servidor.`,
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "setup":
          await this.setupCommand(interaction);
          break;
        case "delete":
          await this.deleteCommand(interaction);
          break;
        default:
          await interaction.reply({
            content: "❌ Subcomando no reconocido.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(`Error en el comando chat-gpt (${subcommand}):`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocurrió un error al procesar el comando. Por favor, inténtelo de nuevo.",
          ephemeral: true,
        });
      }
    }
  },

  async setupCommand(interaction) {
    const channel = interaction.options.getChannel("canal");

    // Obtener la configuración del servidor
    const guildId = interaction.guild.id;
    const guildConfig = await getGuildConfig(guildId) || {};

    // Guardar el canal de Chat IA en la configuración
    guildConfig.chatChannel = channel.id;
    await setGuildConfig(guildId, guildConfig);

    await interaction.reply({
      content: `✅ Sistema establecido correctamente en ${channel}`,
      ephemeral: true,
    });
  },

  async deleteCommand(interaction) {
    const guildId = interaction.guild.id;
    const guildConfig = await getGuildConfig(guildId);

    // Eliminar la configuración del Chat IA
    if (guildConfig && guildConfig.chatChannel) {
      delete guildConfig.chatChannel;
      await setGuildConfig(guildId, guildConfig);
    }

    await interaction.reply({
      content: `✅ El sistema se ha desactivado correctamente.`,
      ephemeral: true,
    });
  },
};const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasPermission } = require('../../permissionsManager');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-color')
        .setDescription('Configura el menú de selección de colores en este canal.')
        .setDefaultMemberPermissions(0), // Sin permisos predeterminados

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const member = interaction.member;

        // Verificar permisos
        if (!hasPermission(guildId, member, 'admin')) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        // Obtener la configuración del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Guardar el canal designado en la configuración
        guildConfig.colorChannel = interaction.channelId;
        await setGuildConfig(guildId, guildConfig);

        // Crear el menú de selección
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select-color')
                .setPlaceholder('Elige un color')
                .addOptions(
                    { label: 'Morado', value: 'morado' },
                    { label: 'Rojo', value: 'rojo' },
                    { label: 'Amarillo', value: 'amarillo' },
                    { label: 'Azul', value: 'azul' },
                    { label: 'Verde', value: 'verde' },
                    { label: 'Rosa', value: 'rosa' },
                    { label: 'Negro', value: 'negro' },
                    { label: 'Naranja', value: 'naranja' },
                ),
        );

        // Enviar el menú de selección
        await interaction.reply({ content: '🎨 Selecciona un color para obtener tu rol:', components: [selectMenu] });
    }
};const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-color')
        .setDescription('Configura el menú de selección de colores en este canal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo administradores pueden usar este comando
    async execute(interaction) {

        const roleId = '1328557869599297591'; // Reemplaza con el ID del rol
        const member = interaction.member;

        // Verifica si el miembro tiene el rol
        if (!member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }
        
        // Verificar si el comando se está ejecutando en el canal correcto
        const canalDesignado = '1332149885235101697'; // Reemplaza con el ID del canal designado
        if (interaction.channelId !== canalDesignado) {
            return interaction.reply({ content: '❌ Este comando solo puede usarse en el canal designado.', flags: 64, });
        }

        // Crear el menú de selección
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select-color')
                .setPlaceholder('Elige un color')
                .addOptions(
                    { label: 'Morado', value: 'morado' },
                    { label: 'Rojo', value: 'rojo' },
                    { label: 'Amarillo', value: 'amarillo' },
                    { label: 'Azul', value: 'azul' },
                    { label: 'Verde', value: 'verde' },
                    { label: 'Rosa', value: 'rosa' },
                    { label: 'Negro', value: 'negro' },
                    { label: 'Naranja', value: 'naranja' },
                ),
        );

        // Enviar el menú de selección
        await interaction.reply({ content: '🎨 Selecciona un color para obtener tu rol:', components: [selectMenu] });
    },
};const {
  ApplicationCommandOptionType,
  ChannelType,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { hasPermission } = require('../../utils/permissionsManager');

// Función para configurar y enviar el embed
async function embedSetup(channel, member) {
    try {
        // Crear un embed básico
        const embed = new EmbedBuilder()
            .setTitle('Título del Embed')
            .setDescription('Este es un embed de ejemplo.')
            .setColor(0x0099ff)
            .setFooter({ text: `Creado por ${member.user.tag}` })
            .setTimestamp();

        // Enviar el embed al canal especificado
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error al crear el embed:', error);
    }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crear un embed en un canal específico")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crea un embed en el canal especificado")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Selecciona un canal")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Verificar permisos de administración o desarrollo
    if (!hasPermission(guildId, member, 'admin') && !hasPermission(guildId, member, 'dev')) {
      return interaction.reply({ content: 'No tienes permiso para usar este comando.', flags: 64 }); // Usar flags para ephemeral
    }

    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel("canal");

    if (!channel) {
      return interaction.reply({ content: "Por favor, selecciona un canal válido.", flags: 64 });
    }

    if (!channel.permissionsFor(interaction.client.user).has("EMBED_LINKS")) {
      return interaction.reply({ content: "No tengo permiso para enviar embeds en ese canal.", flags: 64 });
    }

    await interaction.deferReply({ ephemeral: true }); // Deferir la respuesta y marcarla como efímera
    await interaction.followUp({ content: `Inicio de configuración del embed en ${channel}`, flags: 64 });

    // Llamar a la función embedSetup
    await embedSetup(channel, interaction.member);
  },
};
const {
  ApplicationCommandOptionType,
  ChannelType,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crear un embed en un canal específico")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crea un embed en el canal especificado")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Selecciona un canal")
            .setRequired(true)
        )
    ),
  async execute(interaction) {

    const roleId = '1328557869599297591'; // Reemplaza con el ID del rol
        const member = interaction.member;

        // Verifica si el miembro tiene el rol
        if (!member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }
        
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel("canal");

    if (!channel) {
      return interaction.reply("Por favor, selecciona un canal válido.  ");
    }

    if (!channel.permissionsFor(interaction.client.user).has("EMBED_LINKS")) {
      return interaction.reply(
        "No tengo permiso para enviar embeds en ese canal."
      );
    }

    await interaction.deferReply();

    interaction.followUp(`Inicio de configuración del embed en ${channel} `);
    await embedSetup(channel, interaction.member);
  },
};

async function embedSetup(channel, member) {
  if (!channel) {
    return;
  }

  const sentMsg = await channel.send({
    content: "Haz clic en el botón de abajo para comenzar, ",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("EMBED_ADD")
          .setLabel("Crear Embed")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  const btnInteraction = await channel
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) =>
        i.customId === "EMBED_ADD" &&
        i.member.id === member.id &&
        i.message.id === sentMsg.id,
      time: 20000,
    })
    .catch((ex) => { });

  if (!btnInteraction)
    return sentMsg.edit({ content: "No se recibió respuesta", components: [] });

  await btnInteraction.showModal(
    new ModalBuilder({
      customId: "EMBED_MODAL",
      title: "Generador de Embeds",
      components: [
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Título del Embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Descripción del Embed")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("thumbnail")
            .setLabel("URL de la miniatura del Embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("centerImage")
            .setLabel("URL de la imagen centrada")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("footer")
            .setLabel("Pie de página del Embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
      ],
    })
  );

  const modal = await btnInteraction
    .awaitModalSubmit({
      time: 1 * 60 * 1000,
      filter: (m) =>
        m.customId === "EMBED_MODAL" &&
        m.member.id === member.id &&
        m.message.id === sentMsg.id,
    })
    .catch((ex) => { });

  if (!modal)
    return sentMsg.edit({
      content: "No se recibió respuesta, cancelando configuración,  /Agregame a tu servidor [Mylen](https://discord.com/api/oauth2/authorize?client_id=1145012327209517128&permissions=3276799&scope=bot%20applications.commands)",
      components: [],
    });

  modal.reply({ content: "Embed enviado", ephemeral: true }).catch((ex) => { });

  const title = modal.fields.getTextInputValue("title");
  const description = modal.fields.getTextInputValue("description");
  const footer = modal.fields.getTextInputValue("footer");
  const thumbnail = modal.fields.getTextInputValue("thumbnail");  
  const centerImage = modal.fields.getTextInputValue("centerImage");

  if (!title && !description && !footer)
    return sentMsg.edit({
      content: "No puedes enviar un embed vacío.",
      components: [],
    });

  const embed = new EmbedBuilder();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });
  if (thumbnail) embed.setThumbnail(thumbnail); 
  if (centerImage) embed.setImage(centerImage);

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("EMBED_FIELD_ADD")
      .setLabel("Añadir Campo")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("EMBED_FIELD_REM")
      .setLabel("Eliminar Campo")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("EMBED_FIELD_DONE")
      .setLabel("Listo")
      .setStyle(ButtonStyle.Primary)
  );

  await sentMsg.edit({
    content:
      "Por favor, agrega campos usando los botones a continuación. Haz clic en 'Listo' cuando hayas terminado.",
    embeds: [embed],
    components: [buttonRow],
  });

  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.member.id === member.id,
    message: sentMsg,
    idle: 5 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "EMBED_FIELD_ADD") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EMBED_ADD_FIELD_MODAL",
          title: "Añadir Campo",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Nombre del Campo")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("value")
                .setLabel("Valor del Campo")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("inline")
                .setLabel("En línea (true/false)")
                .setStyle(TextInputStyle.Short)
                .setValue("true")
                .setRequired(true)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({
          time: 5 * 60 * 1000,
          filter: (m) =>
            m.customId === "EMBED_ADD_FIELD_MODAL" && m.member.id === member.id,
        })
        .catch((ex) => { });

      if (!modal) return sentMsg.edit({ components: [] });

      modal
        .reply({ content: "Campo añadido", ephemeral: true })
        .catch((ex) => { });

      const name = modal.fields.getTextInputValue("name");
      const value = modal.fields.getTextInputValue("value");
      let inline = modal.fields.getTextInputValue("inline").toLowerCase();

      if (inline === "true") inline = true;
      else if (inline === "false") inline = false;
      else inline = true;

      const fields = embed.data.fields || [];
      fields.push({ name, value, inline });
      embed.setFields(fields);
    } else if (interaction.customId === "EMBED_FIELD_REM") {
      const fields = embed.data.fields;
      if (fields) {
        fields.pop();
        embed.setFields(fields);
        interaction.reply({ content: "Campo eliminado", ephemeral: true });
      } else {
        interaction.reply({
          content: "No hay campos para eliminar",
          ephemeral: true,
        });
      }
    } else if (interaction.customId === "EMBED_FIELD_DONE") {
      return collector.stop();
    }

    await sentMsg.edit({ embeds: [embed] });
  });

  collector.on("end", async (_collected, _reason) => {
    await sentMsg.edit({ content: "", components: [] });
  });
}
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApexChat, ApexImagine, ApexImageAnalyzer, ApexText2Speech } = require('apexify.js');
const translate = require('@iamtraction/google-translate');
const fs = require('fs');

const validPersonalities = [
    'will'
];

const validSpeechModels = ['elevenlabs'];

const IMAGE_GENERATION_OPTIONS = {
    count: 1,
    nsfw: false,
    deepCheck: false,
    nsfwWords: [],
    negative_prompt: "",
    sampler: "DPM++ 2M Karras",
    height: 512,
    width: 512,
    cfg_scale: 9,
    steps: 20,
    seed: -1,
    image_style: "cinematic"
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Herramientas de IA interactivas')
        .addSubcommand(command => 
            command.setName('image-generate')
                .setDescription('Genera imágenes increíbles con IA')
                .addStringOption(option => 
                    option.setName('prompt')
                        .setDescription('Describe la imagen que quieres crear')
                        .setRequired(true)
                )
        )
        .addSubcommand(command => 
            command.setName('image-analyser')
                .setDescription('Analiza imágenes con inteligencia artificial')
                .addStringOption(option => 
                    option.setName('image-url')
                        .setDescription('URL de la imagen a analizar')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName("prompt")
                        .setDescription("Instrucciones adicionales para el análisis")
                        .setRequired(false)
                )
        )
        .addSubcommand(command => 
            command.setName('chat')
                .setDescription('Conversación con IA inteligente')
                .addStringOption(option => 
                    option.setName('prompt')
                        .setDescription('Escribe tu consulta para la IA')
                        .setRequired(true)
                )
        )
        .addSubcommand(command => 
            command.setName('text-to-speech')
            .setDescription('Convertir texto a voz usando IA')
            .addStringOption(option => 
                option.setName('texto')
                .setDescription('Texto que deseas convertir a voz')
                .setRequired(true)
            )
            .addStringOption(option => 
                option.setName('personalidad')
                .setDescription('Personalidad de la voz a utilizar')
                .setRequired(true)
                .addChoices(
                    ...validPersonalities.map(personality => ({
                        name: personality,
                        value: personality
                    }))
                )
            )
            .addStringOption(option => 
                option.setName('modelo')
                .setDescription('Modelo de TTS a utilizar')
                .setRequired(true)
                .addChoices(
                    ...validSpeechModels.map(model => ({
                        name: model,
                        value: model
                    }))
                )
            )
        ),

    async execute(interaction, client) {
        await interaction.deferReply();
        
        const sub = interaction.options.getSubcommand();

        try {
            switch (sub) {
                case "image-generate":
                    await handleImageGeneration(interaction, client);
                    break;
                case "image-analyser":
                    await handleImageAnalysis(interaction);
                    break;
                case "chat":
                    await handleChatCompletion(interaction);
                    break;
                case "text-to-speech":
                    await handleTextToSpeech(interaction);
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: `🚫 Error al procesar tu solicitud. Intenta de nuevo más tarde.`, 
                flags: 64 
            });
        }
    }
};

async function handleImageGeneration(interaction, client) {
    const prompt = interaction.options.getString('prompt');
    const model = 'flux-pro';

    const imageResponse = await ApexImagine(model, prompt, IMAGE_GENERATION_OPTIONS);
    const imageUrl = Array.isArray(imageResponse) ? imageResponse[0] : imageResponse;

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: `🎨 Generación de Imagen de IA`,
            iconURL: client.user.displayAvatarURL()
        })
        .setTitle(`🖌️ Imagen Generada por🌈`)
        .setDescription(('imagen Generada',prompt))
        .setImage(imageUrl)
        .setColor(client.config.embedAi)
        .setFooter({ 
            text: `Imagen generada con ${model} 🤖`, 
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleImageAnalysis(interaction) {
    const imageUrl = interaction.options.getString('image-url');
    const analysisResult = await ApexImageAnalyzer({ imgURL: imageUrl });
    const translatedAnalysis = await translate(analysisResult, { to: 'es' });

    await interaction.editReply(`🔍 Análisis de Imagen:\n\n${translatedAnalysis.text}`);
}

async function handleChatCompletion(interaction) {
    const prompt = interaction.options.getString('prompt');
    const chatModel = 'gpt-4o';
    const chatResponse = await ApexChat(chatModel, prompt, {
        userId: interaction.user.id,
        memory: false,
        limit: 0,
        instruction: 'You are a friendly assistant.',
    });

    await interaction.editReply(`💬 Respuesta de Chat:\n\n${chatResponse}`);

    }

    async function handleTextToSpeech(interaction, client) {
    const texto = interaction.options.getString('texto');
    const personalidad = interaction.options.getString('personalidad');
    const modelo = interaction.options.getString('modelo');

    try {
        const audioBuffer = await ApexText2Speech({
            inputText: texto,
            personality: personalidad,
            modelName: modelo
        });

        const fileName = `speech_${Date.now()}.mp3`;
        fs.writeFileSync(fileName, audioBuffer);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `🎧 Text-to-Speech`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle(`🗣️ Conversión de Texto a Voz`)
            .setDescription(`**Texto:** ${texto}`)
            .setColor("Aqua")
            .setFooter({ 
                text: `TTS generado con ${modelo} usando la voz de ${personalidad}`, 
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.editReply({ 
            embeds: [embed],
            files: [fileName]
        });

        fs.unlinkSync(fileName);

    } catch (error) {
        console.error(error);
        await interaction.editReply({ 
            content: `🚫 Error al generar el audio. Por favor, intenta de nuevo más tarde.`, 
            flags: 64 
        });
    }
}
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('✨ Selecciona un usuario para obtener la Información')
        .setDMPermission(false)
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('👤 Menciona al usuario del que quieres ver la Información. 👇')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('id')
            .setDescription('🔑 Introduce la ID del usuario si ya no está en el servidor. 👻')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('nombre')
            .setDescription('✍️ Si no sabes la ID, busca por nombre (solo en este servidor). 🔎')
            .setRequired(false)
        ),
    contextMenu: new ContextMenuCommandBuilder()
        .setName('Ver Información')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        await interaction.deferReply();

        const { client, member, guild } = interaction;
        const userOption = interaction.options.getUser('usuario');
        const idOption = interaction.options.getString('id');
        const nameOption = interaction.options.getString('nombre');

        let user;

        if (userOption) user = userOption;
        else if (idOption) {
            try {
                user = await client.users.fetch(idOption);
            } catch (error) {
                return await interaction.editReply({ content: '❌ ¡Oops! No encontré un usuario con esa ID. 🧐' });
            }
        } else if (nameOption) {
            const members = await guild.members.fetch({ query: nameOption, limit: 1 });
            user = members.first()?.user;
            if (!user) {
                return await interaction.editReply({ content: '🤔 No encontré a nadie con ese nombre aquí. 🤷' });
            }
        } else {
            user = member.user;
        }

        const memberData = guild.members.cache.get(user.id) || await guild.members.fetch(user.id); // Obtener info del miembro

        const embedInfo = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`✨ Información de ${user.username}${user.discriminator !== '0' ? `#${user.discriminator}` : ''} ✨`)
            .setThumbnail(user.displayAvatarURL({ size: 256, dynamic: true }))
            .addFields(
                { name: '👤 Nombre', value: user.username, inline: true },
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '🤖 ¿Es Bot?', value: user.bot ? 'Sí' : 'No', inline: true },
                { name: '📅 Creación de la cuenta', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: true },
                { name: '✨ Se unió a este servidor', value: memberData?.joinedTimestamp ? `<t:${Math.floor(memberData.joinedTimestamp / 1000)}:F> (<t:${Math.floor(memberData.joinedTimestamp / 1000)}:R>)` : 'No está en este servidor', inline: true },
                { name: '🎭 Roles', value: memberData?.roles.cache.size > 1 ? memberData.roles.cache.filter(r => r.id !== guild.id).map(r => `<@&${r.id}>`).join(', ') || 'No tiene roles' : 'No tiene roles', inline: true }, // Lista de roles
                // Puedes agregar más información aquí, como el estado, etc.
            )
            .setTimestamp()
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }) });


        const buttonsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('👤 Ver Perfil')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/users/${user.id}`)
            );


        await interaction.editReply({
            content: '¡Aquí tienes la información! 👇',
            embeds: [embedInfo],
            components: [buttonsRow]
        });
    },

    async contextMenuExecute(interaction) {
        const user = await interaction.client.users.fetch(interaction.targetId);
        const memberData = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id);

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`✨ Información de ${user.tag} (Clic derecho) ✨`)
            .setThumbnail(user.displayAvatarURL({ size: 256, dynamic: true }))
            .addFields(
                { name: '👤 Nombre', value: user.username, inline: true },
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '🤖 ¿Es Bot?', value: user.bot ? 'Sí' : 'No', inline: true },
                { name: '📅 Creación de la cuenta', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: true },
                { name: '✨ Se unió a este servidor', value: memberData?.joinedTimestamp ? `<t:${Math.floor(memberData.joinedTimestamp / 1000)}:F> (<t:${Math.floor(memberData.joinedTimestamp / 1000)}:R>)` : 'No está en este servidor', inline: true },
                { name: '🎭 Roles', value: memberData?.roles.cache.size > 1 ? memberData.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'No tiene roles' : 'No tiene roles', inline: true }, // Lista de roles

            )
            .setFooter({ text: `Pedido desde el menú contextual` });

        const buttonsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('👤 Ver Perfil')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/users/${user.id}`)
            );

        await interaction.reply({ embeds: [embed], components: [buttonsRow], flags: 64 });
    },
};const { SlashCommandBuilder } = require('@discordjs/builders');
const { getGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Muestra tu nivel actual'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Obtener la configuración del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Inicializar datos de niveles si no existen
        if (!guildConfig.levels) {
            guildConfig.levels = {};
        }
        if (!guildConfig.levels[userId]) {
            guildConfig.levels[userId] = { xp: 0, level: 0 };
        }

        const userLevelData = guildConfig.levels[userId];

        // Mostrar el nivel y la experiencia
        await interaction.reply(`Nivel: ${userLevelData.level}, XP: ${userLevelData.xp}`);
    },
};const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const pool = require('../../database/db'); // Importa la conexión a la base de datos

// Cooldown global y por usuario
const globalCooldown = new Set();
const userCooldown = new Map(); // Almacena el último uso del comando por usuario

// Probabilidades de cada premio (en porcentaje)
const premios = [
    { cantidad: 500, probabilidad: 20, emoji: '🟢' },   // 20% de probabilidad
    { cantidad: 1000, probabilidad: 15, emoji: '🔵' },  // 15% de probabilidad
    { cantidad: 2000, probabilidad: 10, emoji: '🟣' },  // 10% de probabilidad
    { cantidad: 5000, probabilidad: 4, emoji: '🟠' },   // 4% de probabilidad
    { cantidad: 10000, probabilidad: 1, emoji: '🟡' },  // 1% de probabilidad
];

// Función para seleccionar un premio basado en las probabilidades
function seleccionarPremio() {
    const totalProbabilidad = premios.reduce((sum, premio) => sum + premio.probabilidad, 0);
    const random = Math.random() * totalProbabilidad;

    let acumulado = 0;
    for (const premio of premios) {
        acumulado += premio.probabilidad;
        if (random <= acumulado) {
            return premio;
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loteria')
        .setDescription('Participa en la lotería para ganar Noxcoins.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // Verificar cooldown por usuario (24 horas)
        const ahora = Date.now();
        const ultimoUso = userCooldown.get(userId) || 0;
        const tiempoRestante = 24 * 60 * 60 * 1000 - (ahora - ultimoUso); // 24 horas en milisegundos

        if (tiempoRestante > 0) {
            const horasRestantes = Math.floor(tiempoRestante / (60 * 60 * 1000));
            const minutosRestantes = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));

            const embedCooldown = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('⏳ Cooldown')
                .setDescription(`Debes esperar **${horasRestantes} horas y ${minutosRestantes} minutos** antes de usar este comando de nuevo.`);

            return interaction.reply({ embeds: [embedCooldown], flags: MessageFlags.FLAGS.EPHEMERAL });
        }

        // Verificar si el usuario está vinculado
        try {
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [userId]);

            if (syncRows.length === 0) {
                const embedNoVinculado = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('Error')
                    .setDescription('No has vinculado tu cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.reply({ embeds: [embedNoVinculado], flags: MessageFlags.FLAGS.EPHEMERAL });
            }

            const minecraftUuid = syncRows[0].minecraft_uuid;

            // Agregar cooldown global y por usuario
            globalCooldown.add('loteria');
            userCooldown.set(userId, ahora); // Registrar el último uso del comando

            // Eliminar cooldown global después de 30 segundos
            setTimeout(() => globalCooldown.delete('loteria'), 30000);

            await interaction.deferReply();

            // Crear embed inicial con cuenta regresiva
            const embedInicial = new EmbedBuilder()
                .setColor(0xFFD700) // Color dorado para la lotería
                .setTitle('🎰 Lotería de Noxcoins')
                .setDescription('🎲 Girando la ruleta...')
                .setFooter({ text: '¡El resultado se revelará en 5 segundos!' });

            await interaction.editReply({ embeds: [embedInicial] });

            for (let i = 5; i > 0; i--) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                embedInicial.setDescription(`🎲 Girando la ruleta...\n⏳ **${i}** segundos restantes.`);
                await interaction.editReply({ embeds: [embedInicial] });
            }

            // Seleccionar premio
            const premio = seleccionarPremio();

            // Agregar el premio al saldo del usuario en discord_economy
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins + ? WHERE discord_id = ?', [premio.cantidad, userId]);

            // Agregar el premio al saldo del usuario en xconomy
            await pool.query('UPDATE xconomy SET balance = balance + ? WHERE UID = ?', [premio.cantidad, minecraftUuid]);

            // Obtener el saldo actual del usuario desde discord_economy
            const [discordBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [userId]);
            const saldoActual = discordBalanceRows[0].noxcoins;

            // Crear embed con el resultado final
            const embedFinal = new EmbedBuilder()
                .setColor(0x00FF00) // Color verde para indicar éxito
                .setTitle('🎉 ¡Felicidades!')
                .setDescription(`${premio.emoji} ¡Has ganado **${premio.cantidad} Noxcoins**!`)
                .addFields(
                    { name: '💰 Saldo actual', value: `${saldoActual} Noxcoins`, inline: true },
                    { name: '🎰 Premio obtenido', value: `${premio.cantidad} Noxcoins`, inline: true }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })) // Mostrar el avatar del usuario
                .setFooter({ text: '¡Vuelve a intentarlo en 24 horas!' })
                .setTimestamp(); // Agrega la hora actual

            await interaction.editReply({ embeds: [embedFinal] });
        } catch (error) {
            console.error(error);
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('Error')
                .setDescription('Hubo un error al procesar la lotería.');
            await interaction.editReply({ embeds: [embedError] });
        }
    },
};const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Envía un meme aleatorio'),

    async execute(interaction) {
        try {
            // Deferir la respuesta para evitar el timeout
            await interaction.deferReply();

            // Obtener el meme de la API
            const response = await axios({
                method: 'get',
                url: 'https://api.fgmods.xyz/api/img/meme',
                params: {
                    apikey: 'HzfXPLfd'
                },
                responseType: 'arraybuffer'
            });

            // Verificar si la respuesta es una imagen
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image')) {
                throw new Error('La respuesta no es una imagen');
            }

            // Obtener la extensión del archivo a partir del content-type
            const extension = contentType.split('/')[1];

            // Enviar el meme como archivo adjunto
            await interaction.editReply({
                content: '😂 Tu momazo super divertido 😂',
                files: [{
                    attachment: Buffer.from(response.data),
                    name: `meme.${extension}`
                }]
            });

            // Reaccionar al mensaje enviado
            const mensaje = await interaction.fetchReply();
            await mensaje.react('😂');

        } catch (error) {
            console.error('Error al obtener el meme:', error);
            await interaction.editReply('¡Hubo un error al obtener el meme! Por favor, inténtalo de nuevo.');
        }
    }
};const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('momazos')
        .setDescription('Envía un meme aleatorio'),

    async execute(interaction) {
        try {

            await interaction.deferReply();

            const response = await axios({
                method: 'get',
                url: 'https://api.fgmods.xyz/api/img/meme',
                params: {
                    apikey: 'HzfXPLfd'
                },
                responseType: 'arraybuffer'
            });

            await interaction.editReply({
                content: '😂 Tu momazo super divertido 😂',
                files: [{
                    attachment: Buffer.from(response.data),
                    name: 'meme.png'
                }]
            });

            const mensaje = await interaction.fetchReply();
            await mensaje.react('😂');

        } catch (error) {
            console.error('Error al obtener el meme:', error);
            await interaction.editReply('¡Hubo un error al obtener el meme! Por favor, inténtalo de nuevo.');
        }
    }
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const diskusage = require('diskusage');
const { hasPermission } = require('../../utils/permissionsManager');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function getResourceUsage() {
  const cpuUsage = process.cpuUsage();
  const cpuUser = (cpuUsage.user / 1000).toFixed(2);
  const cpuSystem = (cpuUsage.system / 1000).toFixed(2);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const diskInfo = diskusage.checkSync('/');
  const diskFree = diskInfo.free;
  const diskTotal = diskInfo.total;

  return {
    cpu: {
      user: cpuUser,
      system: cpuSystem,
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
    },
    storage: {
      total: formatBytes(diskTotal),
      free: formatBytes(diskFree),
    },
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recursos')
    .setDescription('Muestra el uso de recursos del sistema.'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Verificar permisos de administración o desarrollo
    if (!hasPermission(guildId, member, 'admin') && !hasPermission(guildId, member, 'dev')) {
      return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
    }

    const resources = getResourceUsage();

    const embed = new EmbedBuilder()
      .setTitle('Uso de Recursos')
      .addFields(
        { name: 'CPU', value: `Usuario: ${resources.cpu.user} ms\nSistema: ${resources.cpu.system} ms` },
        { name: 'Memoria RAM', value: `Total: ${resources.memory.total}\nUsada: ${resources.memory.used}\nLibre: ${resources.memory.free}` },
        { name: 'Almacenamiento', value: `Total: ${resources.storage.total}\nLibre: ${resources.storage.free}` }
      )
      .setColor('#00FF00');

    await interaction.reply({ embeds: [embed] });
  },
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const diskusage = require('diskusage');


function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}


function getResourceUsage() {

    const cpuUsage = process.cpuUsage();
    const cpuUser = (cpuUsage.user / 1000).toFixed(2);
    const cpuSystem = (cpuUsage.system / 1000).toFixed(2);


    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;


    const diskInfo = diskusage.checkSync('/');
    const diskFree = diskInfo.free;
    const diskTotal = diskInfo.total;

    return {
        cpu: {
            user: cpuUser,
            system: cpuSystem,
        },
        memory: {
            total: formatBytes(totalMem),
            used: formatBytes(usedMem),
            free: formatBytes(freeMem),
        },
        storage: {
            total: formatBytes(diskTotal),
            free: formatBytes(diskFree),
        },
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recursos')
        .setDescription('Muestra el uso de recursos del sistema.'),
    async execute(interaction) {
        const resources = getResourceUsage();

        const embed = new EmbedBuilder()
            .setTitle('Uso de Recursos')
            .addFields(
                { name: 'CPU', value: `Usuario: ${resources.cpu.user} ms\nSistema: ${resources.cpu.system} ms` },
                { name: 'Memoria RAM', value: `Total: ${resources.memory.total}\nUsada: ${resources.memory.used}\nLibre: ${resources.memory.free}` },
                { name: 'Almacenamiento', value: `Total: ${resources.storage.total}\nLibre: ${resources.storage.free}` }
            )
            .setColor('#00FF00');

        await interaction.reply({ embeds: [embed] });
    },
};const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const pool = require('../../database/db'); // Importa la conexión a la base de datos

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfiere Noxcoins a otro usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres transferir Noxcoins.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de Noxcoins que quieres transferir.')
                .setRequired(true)),
    async execute(interaction) {
        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');

        // Verificar que no se transfiera a un bot
        if (receiver.bot) {
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('No puedes transferir Noxcoins a un bot.');
            return interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
        }

        // Verificar que la cantidad sea mayor que 0
        if (amount <= 0) {
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('La cantidad debe ser mayor que 0.');
            return interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
        }

        try {
            // Obtener el saldo del remitente
            const [senderBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [senderId]);
            const senderBalance = senderBalanceRows[0].noxcoins;

            // Verificar que el remitente tenga suficiente saldo
            if (senderBalance < amount) {
                const embedError = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('❌ Error')
                    .setDescription('No tienes suficientes Noxcoins para realizar esta transferencia.');
                return interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
            }

            // Obtener el saldo del receptor
            const [receiverBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [receiver.id]);
            const receiverBalance = receiverBalanceRows[0].noxcoins;

            // Transferir Noxcoins
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins - ? WHERE discord_id = ?', [amount, senderId]); // Restar al remitente
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins + ? WHERE discord_id = ?', [amount, receiver.id]); // Sumar al receptor

            // Crear el Embed de confirmación
            const embedSuccess = new EmbedBuilder()
                .setColor(0x00FF00) // Verde
                .setTitle('✅ Transferencia Exitosa')
                .setDescription(`Has transferido **${amount} Noxcoins** a ${receiver.username}.`)
                .addFields(
                    { name: '💰 Tu saldo actual', value: `${senderBalance - amount} Noxcoins`, inline: true },
                    { name: `💰 Saldo de ${receiver.username}`, value: `${receiverBalance + amount} Noxcoins`, inline: true }
                )
                .setFooter({ text: '¡Gracias por usar Noxcoins!' })
                .setTimestamp();

            // Enviar el Embed como respuesta
            await interaction.reply({ embeds: [embedSuccess] });
        } catch (error) {
            console.error('Error en la transferencia:', error);

            // Crear un Embed de error
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error en la Transferencia')
                .setDescription('Hubo un error al realizar la transferencia. Por favor, inténtalo de nuevo más tarde.')
                .setFooter({ text: 'Si el problema persiste, contacta al soporte.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
        }
    },
};const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecoins')
        .setDescription('Elimina Noxcoins de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres eliminar Noxcoins.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de Noxcoins que quieres eliminar.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Solo administradores
        .setDMPermission(false), // No permitir en mensajes directos

    async execute(interaction) {
        const roleId = '1328557869599297591'; // Reemplaza con el ID del rol
        const member = interaction.member;

        // Verificar si el miembro tiene el rol
        if (!member.roles.cache.has(roleId)) {
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('No tienes permiso para usar este comando.');
            return interaction.reply({ embeds: [embedError], flags: 'EPHEMERAL' });
        }

        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');

        // Verificar que la cantidad sea mayor que 0
        if (amount <= 0) {
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('La cantidad debe ser mayor que 0.');
            return interaction.reply({ embeds: [embedError], flags: 'EPHEMERAL' });
        }

        try {
            // Obtener el saldo del usuario objetivo
            const [targetBalanceRows] = await pool.query('SELECT noxcoins FROM discord_economy WHERE discord_id = ?', [targetUser.id]);

            if (targetBalanceRows.length === 0) {
                const embedError = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('❌ Error')
                    .setDescription(`${targetUser.username} no tiene un registro en la economía.`);
                return interaction.reply({ embeds: [embedError], flags: 'EPHEMERAL' });
            }

            const targetBalance = targetBalanceRows[0].noxcoins;

            // Verificar que el usuario tenga suficientes Noxcoins
            if (targetBalance < amount) {
                const embedError = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('❌ Error')
                    .setDescription(`${targetUser.username} no tiene suficientes Noxcoins.`);
                return interaction.reply({ embeds: [embedError], flags: 'EPHEMERAL' });
            }

            // Eliminar Noxcoins del usuario
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins - ? WHERE discord_id = ?', [amount, targetUser.id]);

            // Crear el Embed de confirmación
            const embedSuccess = new EmbedBuilder()
                .setColor(0x00FF00) // Verde
                .setTitle('✅ Noxcoins Eliminados')
                .setDescription(`Se han eliminado **${amount} Noxcoins** de ${targetUser.username}.`)
                .addFields(
                    { name: '💰 Saldo anterior', value: `${targetBalance} Noxcoins`, inline: true },
                    { name: '💰 Saldo actual', value: `${targetBalance - amount} Noxcoins`, inline: true }
                )
                .setFooter({ text: '¡Gracias por usar Noxcoins!' })
                .setTimestamp();

            // Enviar el Embed como respuesta
            await interaction.reply({ embeds: [embedSuccess] });
        } catch (error) {
            console.error('Error al eliminar Noxcoins:', error);

            // Crear un Embed de error
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('Hubo un error al eliminar los Noxcoins. Por favor, inténtalo de nuevo más tarde.')
                .setFooter({ text: 'Si el problema persiste, contacta al soporte.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embedError], flags: 'EPHEMERAL' });
        }
    },
};const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(`server`)
        .setDescription(`Imformacion del servidor`),
    async execute(interaction) {
        await interaction.reply(`Este servidor es ${interaction.guild.name} y este ${interaction.guild.memberCount} miembros.`);
    },
};const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-counting-channel')
        .setDescription('Configura el canal de conteo para este servidor.')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal donde se realizará el conteo.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo administradores pueden usar este comando
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const guildId = interaction.guild.id;

        // Verificar que el canal sea de tipo texto
        if (!channel.isTextBased()) {
            return interaction.reply({ content: 'El canal debe ser un canal de texto.', ephemeral: true });
        }

        // Obtener la configuración actual del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Actualizar el canal de conteo
        guildConfig.countingChannel = channel.id;

        // Guardar la configuración
        await setGuildConfig(guildId, guildConfig);

        // Responder al usuario
        await interaction.reply({ content: `El canal de conteo se ha configurado en ${channel}.`, ephemeral: true });
    },
};const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-ticket-channel')
        .setDescription('Configura el canal donde se enviará el panel de tickets.')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal donde se enviará el panel de tickets.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo administradores pueden usar este comando
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const guildId = interaction.guild.id;

        // Verificar que el canal sea de tipo texto
        if (!channel.isTextBased()) {
            return interaction.reply({ content: 'El canal debe ser un canal de texto.', ephemeral: true });
        }

        // Obtener la configuración actual del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Inicializar la configuración de tickets si no existe
        if (!guildConfig.ticketPanel) {
            guildConfig.ticketPanel = {
                ticketCategoryID: 'DEFAULT_CATEGORY_ID',
                supportRoleID: 'DEFAULT_ROLE_ID',
                ticketLogChannelID: 'DEFAULT_CHANNEL_ID'
            };
        }

        // Actualizar el canal de tickets
        guildConfig.ticketPanel.ticketChannelID = channel.id;

        // Guardar la configuración
        await setGuildConfig(guildId, guildConfig);

        // Responder al usuario
        await interaction.reply({ content: `El canal de tickets se ha configurado en ${channel}.`, ephemeral: true });
    },
};const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcomechannel')
        .setDescription('Configura el canal de bienvenidas para este servidor.')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal donde se enviarán los mensajes de bienvenida.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo administradores pueden usar este comando
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const guildId = interaction.guild.id;

        // Verificar que el canal sea de tipo texto
        if (!channel.isTextBased()) {
            return interaction.reply({ content: 'El canal debe ser un canal de texto.', ephemeral: true });
        }

        // Obtener la configuración actual del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Actualizar el canal de bienvenidas
        guildConfig.welcomeChannel = channel.id;

        // Guardar la configuración
        await setGuildConfig(guildId, guildConfig);

        // Responder al usuario
        await interaction.reply({ content: `El canal de bienvenidas se ha configurado en ${channel}.`, ephemeral: true });
    },
};// commands/tickets/ticketPanel.js
const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Envía el panel de tickets con las reglas.'),

  async execute(interaction) {
    const rulesEmbed = new EmbedBuilder()
      .setTitle('Sistema de Tickets')
      .setDescription(
        'Por favor, lee las siguientes reglas antes de crear un ticket:\n\n' +
        '1. No abuses del sistema de tickets.\n' +
        '2. Sé claro y conciso en tu solicitud.\n' +
        '3. El staff te atenderá a la brevedad.\n' +
        '4. No se permiten mensajes con spam o lenguaje ofensivo.\n\n' +
        'Si estás de acuerdo, presiona el botón **Crear Ticket** para iniciar.'
      )
      .setColor(0x0099ff);

    const createButton = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Crear Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(createButton);

    await interaction.reply({ embeds: [rulesEmbed], components: [row] });
  }
};
const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/guildDataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Envía el panel de tickets con las reglas.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        // Obtener la configuración del servidor
        const guildConfig = await getGuildConfig(guildId) || {};

        // Verificar si el canal de tickets está configurado
        if (!guildConfig.ticketPanel || !guildConfig.ticketPanel.ticketChannelID) {
            return interaction.reply({ content: 'El canal de tickets no está configurado. Usa `/set-ticket-channel` para configurarlo.', ephemeral: true });
        }

        // Crear el embed con las reglas y opciones
        const rulesEmbed = new EmbedBuilder()
            .setTitle('🎟️ Sistema de Tickets')
            .setDescription(
                '⚠️ **Advertencia:** Solo abre un ticket si es necesario. El abuso del sistema de tickets puede resultar en sanciones.\n\n' +
                '**¿Para qué sirve cada opción?**\n' +
                '🔧 **Problemas del servidor de Minecraft:** Reporta problemas técnicos con el servidor.\n' +
                '👥 **Problemas con miembros del servidor:** Reporta problemas con otros miembros.\n' +
                '💳 **Compras y soporte:** Solicita ayuda con compras o problemas de pago.\n\n' +
                'Selecciona una opción para crear un ticket:'
            )
            .setColor(0x0099ff);

        // Crear botones para cada opción de ticket
        const minecraftButton = new ButtonBuilder()
            .setCustomId('ticket_minecraft')
            .setLabel('Problemas de Minecraft')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔧');

        const membersButton = new ButtonBuilder()
            .setCustomId('ticket_members')
            .setLabel('Problemas con miembros')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👥');

        const purchasesButton = new ButtonBuilder()
            .setCustomId('ticket_purchases')
            .setLabel('Compras y soporte')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💳');

        const row = new ActionRowBuilder().addComponents(minecraftButton, membersButton, purchasesButton);

        // Enviar el panel de tickets al canal configurado
        const ticketChannel = interaction.guild.channels.cache.get(guildConfig.ticketPanel.ticketChannelID);
        if (ticketChannel) {
            await ticketChannel.send({ embeds: [rulesEmbed], components: [row] });
            await interaction.reply({ content: '✅ El panel de tickets se ha enviado correctamente.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ No se pudo encontrar el canal de tickets.', ephemeral: true });
        }
    },
};const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tweet')
    .setDescription('Este comando permite hacer un tweet.')
    .addStringOption(option => option
      .setName('texto')
      .setDescription('Escribe el texto que quieras que salga en el tweet.')
      .setMaxLength(280)
      .setMinLength(1)
      .setRequired(true)),

  async execute(interaction, client) {
    const user = interaction.user;
    const comentario = interaction.options.getString('texto');
    // Forzar el avatar a ser PNG
    const userAvatar = user.displayAvatarURL({ forceStatic: true, size: 128, extension: 'png' });

    // Generar números aleatorios para los contadores
    const retweets = Math.floor(Math.random() * 1000);
    const quoteTweets = Math.floor(Math.random() * 500);
    const likes = Math.floor(Math.random() * 10000);
    const views = Math.floor(Math.random() * 100000);

    try {
      // Cargar la imagen del avatar del usuario
      const avatar = await loadImage(userAvatar);

      // Crear el lienzo y el contexto
      const canvas = createCanvas(600, 250);
      const ctx = canvas.getContext('2d');

      // --- Estilo Modo Oscuro ---
      // Fondo del tweet
      ctx.fillStyle = '#15202b'; // Gris oscuro para el fondo
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Resto del dibujo ---
      // Dibujar el avatar del usuario
      ctx.drawImage(avatar, 20, 20, 60, 60);

      // Nombre, usuario y verificado
      ctx.fillStyle = '#ffffff'; // Blanco para el texto
      ctx.font = 'bold 20px Arial';
      ctx.fillText(user.username, 100, 40);

      ctx.fillStyle = '#8899a6'; // Gris claro para detalles
      ctx.font = '16px Arial';
      ctx.fillText(`@${user.globalName}`, 100, 65);

      ctx.fillText('✅', ctx.measureText(user.username).width + 110, 40);

      // Comentario
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.fillText(comentario, 20, 120);

      // Fecha y hora
      const now = new Date();
      const timestamp = `${now.toLocaleTimeString()} · ${now.toLocaleDateString()}`;
      ctx.fillStyle = '#8899a6';
      ctx.font = '14px Arial';
      ctx.fillText(timestamp, 20, 200);

      // Contadores
      ctx.fillStyle = '#8899a6'; 
      ctx.font = '14px Arial';
      ctx.fillText('💬', 20, 235);
      ctx.fillText(quoteTweets.toLocaleString(), 40, 235);
      ctx.fillText('🔁', 130, 235);
      ctx.fillText(retweets.toLocaleString(), 150, 235);
      ctx.fillText('❤️', 240, 235);
      ctx.fillText(likes.toLocaleString(), 260, 235);
      ctx.fillText('👀', 350, 235);
      ctx.fillText(views.toLocaleString(), 370, 235);

      // Crear un attachment con la imagen generada
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'tweet.png' });

      // Enviar el tweet como una imagen en un embed
      const embed = new EmbedBuilder()
        .setColor('#1DA1F2') // Azul de Twitter
        .setImage('attachment://tweet.png');

      interaction.reply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error("Error al generar el tweet:", error);
      interaction.reply({ content: 'Hubo un error al generar el tweet.', ephemeral: true });
    }
  },
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Proporciona información sobre el usuario.'),

  async execute(interaction) {
    const user = interaction.user;
    const member = interaction.member;

    const embed = new EmbedBuilder()
      .setTitle(`Información de ${user.username}`)
      .setColor('Blue')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Nombre', value: user.username, inline: true },
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '🤖 ¿Es Bot?', value: user.bot ? 'Sí' : 'No', inline: true },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '✨ Se unió al servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true }
      )
      .setFooter({ text: `Solicitado por ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../../utils/permissionsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificacion_embed')
    .setDescription('Crea un embed de verificación en el canal actual.'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Verificar permisos de administración o desarrollo
    if (!hasPermission(guildId, member, 'admin') && !hasPermission(guildId, member, 'dev')) {
      return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Verificación')
      .setDescription('Presiona el botón de abajo para iniciar la verificación.')
      .setColor(0x00AE86);

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('iniciar_verificacion')
          .setLabel('Iniciar Verificación')
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.reply({ embeds: [embed], components: [button] });
  },
};const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificacion_embed')
        .setDescription('Crea un embed de verificación en el canal actual.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Verificación')
            .setDescription('Presiona el botón de abajo para iniciar la verificación.')
            .setColor(0x00AE86);

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('iniciar_verificacion')
                    .setLabel('Iniciar Verificación')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [embed], components: [button] });
    },
};const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getwaifu')
    .setDescription('Genera tu waifu')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Seleccione su categoría')
        .setRequired(true)
        .addChoices(
          { name: 'Waifu', value: 'waifu' },
          { name: 'Maid', value: 'maid' },
          { name: 'Marin Kitagawa', value: 'marin-kitagawa' },
          { name: 'Mori Calliope', value: 'mori-calliope' },
          { name: 'Raiden Shogun', value: 'raiden-shogun' },
          { name: 'Oppai', value: 'oppai' },
          { name: 'Selfies', value: 'selfies' },
          { name: 'Uniform', value: 'uniform' },
          { name: 'Kamisato Ayaka', value: 'kamisato-ayaka' }
        )),

  async execute(interaction) {
    const type = interaction.options.getString('categoria');

    try {
      const response = await fetch(`https://api.waifu.im/search/?included_tags=${type}`);
      if (!response.ok) throw new Error('Error al obtener la waifu');

      const body = await response.json();

      const embed = new EmbedBuilder()
        .setTitle('Hola, soy tu waifu ♥️')
        .setColor('DarkButNotBlack')
        .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp()
        .setImage(body.images[0].url);

      await interaction.reply({ embeds: [embed] });

      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');
    } catch (error) {
      console.error('Error en el comando getwaifu:', error);
      await interaction.reply({ content: 'Hubo un error al generar tu waifu. Por favor, inténtalo de nuevo.', ephemeral: true });
    }
  }
};const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const pool = require('../../database/db'); // Importa la conexión a la base de datos

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabaja para ganar dinero.'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            // Verificar si el usuario está vinculado
            const [syncRows] = await pool.query('SELECT * FROM sync_economy WHERE discord_id = ?', [userId]);

            if (syncRows.length === 0) {
                const embedError = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setTitle('❌ Error')
                    .setDescription('No has vinculado tu cuenta de Minecraft. Usa `/link` para vincularla.');
                return interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
            }

            // Obtener el último trabajo del usuario
            const [userRows] = await pool.query('SELECT last_work FROM discord_economy WHERE discord_id = ?', [userId]);
            const lastWork = userRows[0].last_work || 0;

            const ahora = Date.now();
            const cooldown = 4 * 60 * 60 * 1000; // 4 horas en milisegundos

            // Verificar si el usuario está en cooldown
            if (ahora - lastWork < cooldown) {
                const tiempoRestante = cooldown - (ahora - lastWork);
                const horas = Math.floor(tiempoRestante / 3600000);
                const minutos = Math.floor((tiempoRestante % 3600000) / 60000);

                const embedCooldown = new EmbedBuilder()
                    .setColor(0xFF0000) // Rojo
                    .setDescription(`⏳ No puedes trabajar de nuevo durante **${horas}h ${minutos}m**.`);

                return interaction.reply({ embeds: [embedCooldown], flags: MessageFlags.FLAGS.EPHEMERAL });
            }

            // Lista de trabajos y recompensas
            const trabajos = [
                "Usted sacastes a los perros y recojistes sus cacas. Esto te generó {dinero} Noxcoins.",
                "Usted programó un bot de Discord, se hizo famoso y ganó {dinero} Noxcoins.",
                "Usted creó un servidor RP, se hizo bastante famoso y es de los mejores (RP Hispano) y ganaste {dinero} Noxcoins.",
                "Pediste dinero por la calle y ganaste {dinero} Noxcoins.",
                "Trabajaste como presidente del Betis pero te despidieron 2 segundos después, ganaste: {dinero} Noxcoins.",
                "Trabajaste de limpiador de cristales y ganaste {dinero} Noxcoins.",
                "Trabajaste de limpiador de baños y ganaste: {dinero} Noxcoins.",
                "Fuiste a apostar 20k pero te quedaste sin nada y apenas ganaste: {dinero} Noxcoins.",
                "Trabajaste de limpiador de vehículos y ganaste: {dinero} Noxcoins.",
                "Has sido esclavo de @darkdead98407, como le diste pena te dio: {dinero} Noxcoins."
            ];

            // Generar cantidad aleatoria de dinero
            const dineroGanado = Math.floor(Math.random() * 101) + 100;
            const trabajoElegido = trabajos[Math.floor(Math.random() * trabajos.length)].replace('{dinero}', dineroGanado);

            // Actualizar el saldo y el último trabajo del usuario
            await pool.query('UPDATE discord_economy SET noxcoins = noxcoins + ?, last_work = ? WHERE discord_id = ?', [dineroGanado, ahora, userId]);

            // Crear Embed de respuesta
            const embed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(trabajoElegido)
                .setColor(0x00FF00) // Verde
                .setFooter({ text: '¡Vuelve a trabajar en 4 horas!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en el comando work:', error);

            // Crear un Embed de error
            const embedError = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo
                .setTitle('❌ Error')
                .setDescription('Hubo un error al procesar el comando. Por favor, inténtalo de nuevo más tarde.')
                .setFooter({ text: 'Si el problema persiste, contacta al soporte.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embedError], flags: MessageFlags.FLAGS.EPHEMERAL });
        }
    },
};