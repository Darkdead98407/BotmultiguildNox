const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const channel = member.guild.channels.cache.get('1328557870144426048'); // Reemplaza con el ID del canal de bienvenida
        const memberCountChannel = member.guild.channels.cache.get('1337234406884249732'); // Reemplaza con el ID del canal de contador de miembros
        if (!channel) return;

        const canvas_width = 700;
        const canvas_height = 700;
        const cnv = createCanvas(canvas_width, canvas_height);
        const ctx = cnv.getContext('2d');

        try {
            // Cargar la imagen de fondo
            const background = await loadImage(path.join(__dirname, 'fondo.png'));
            ctx.drawImage(background, 0, 0, canvas_width, canvas_height);

            // Dibujar el título
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Bienvenidos a Noxium', canvas_width / 2, 50);

            // Cargar y dibujar el avatar del usuario
            const avatar = await loadImage(member.user.displayAvatarURL({ format: 'png', size: 256 }));
            const avatarX = canvas_width / 4 - 45;
            const avatarY = 140;
            const avatarRadius = 220;

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarRadius * 2, avatarRadius * 2);
            ctx.restore();

            // Dibujar el nombre del usuario
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(member.user.tag, canvas_width / 2, avatarY + avatarRadius * 2 + 30);

            // Crear la imagen adjunta
            const attachment = new AttachmentBuilder(cnv.toBuffer('image/png'), { name: 'welcome.png' });

            // Crear el embed de bienvenida
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`¡Bienvenido a ${member.guild.name}!`)
                .setDescription(`¡Hola ${member}, esperamos que disfrutes tu tiempo aquí!`)
                .setImage('attachment://welcome.png')
                .setFooter({ text: `Miembro ${member.guild.memberCount}` })
                .addFields(
                    { name: 'Es hora de empezar tu nueva aventura', value: 'Aquí encontrarás loterías, juegos y más para ganar Noxcoins que te servirán dentro del servidor Noxium.' },
                    { name: '```!IMPORTANTE!```', value: '```Lee las normas y por favor respétalas.``` https://discord.com/channels/1328557869599297587/1328557870144426049' }
                );

            // Enviar el mensaje de bienvenida
            channel.send({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Error al generar la imagen de bienvenida:', error);
        }

        // Actualizar el canal de conteo de miembros
        if (memberCountChannel) {
            try {
                const memberCount = member.guild.memberCount;
                const newName = `Miembros: ${memberCount}`;
                await memberCountChannel.setName(newName);
            } catch (error) {
                console.error('Error al actualizar el nombre del canal:', error);
            }
        }
    },
};
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config.json");
const fs = require('fs');
const path = require('path');
const util = require('util');
const { getGuildConfig } = require("../utils/guildDataManager");

const readFileAsync = util.promisify(fs.readFile);

module.exports = {
  name: "messageCreate",

  async execute(message) {
    // Ignorar mensajes de bots
    if (message.author.bot) return;

    // Obtener la configuración del servidor
    const guildId = message.guild.id;
    const guildConfig = await getGuildConfig(guildId);

    // Verificar si el sistema de Chat IA está activado en el servidor
    if (!guildConfig || !guildConfig.chatChannel) return; // Si no hay configuración, ignora el mensaje

    try {
      const MODEL = "gemini-pro";
      const API_KEY = config.API_KEY;

      const ai = new GoogleGenerativeAI(API_KEY);
      const model = ai.getGenerativeModel({
        model: MODEL,
      });

      // Verificar si el mensaje fue enviado en el canal configurado
      if (message.channel.id !== guildConfig.chatChannel) return;

      // Leer el archivo de personalidad
      const personalityFilePath = path.join(__dirname, "../personality.txt");
      const personalityContent = await readFileAsync(personalityFilePath, 'utf-8');
      const personalityLines = personalityContent.trim();

      // Crear el prompt para la IA
      const prompt = `
${personalityLines}

Instructions:
1. Saluda al usuario: <@${message.author.id}>
2. Responda al siguiente mensaje manteniendo la personalidad descrita anteriormente.
3. Responda con menos de 2000 caracteres.

User message: ${message.cleanContent}

Your response:`;

      // Generar la respuesta con la IA
      const { response } = await model.generateContent(prompt);
      const generatedText = response.text().trim();

      // Asegurarse de que la respuesta no esté vacía y dentro del límite de caracteres
      const finalResponse = generatedText.length > 0 ? 
        (generatedText.length > 2000 ? generatedText.substring(0, 1997) + "..." : generatedText) : 
        "Lo siento, no pude generar una respuesta apropiada.";

      // Responder al mensaje
      await message.reply({
        content: finalResponse,
        allowedMentions: {
          parse: ["everyone", "roles", "users"],
        },
      });

    } catch (error) {
      console.error("Error en el evento messageCreate:", error);
      return;
    }
  },
};module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Ignorar si no es un menú de selección
        if (!interaction.isStringSelectMenu()) return;

        // Verificar si la interacción es en el canal correcto
        const canalDesignado = '1332149885235101697'; // Reemplaza con el ID del canal designado
        if (interaction.channelId !== canalDesignado) {
            return interaction.reply({ content: '❌ Este comando solo puede usarse en el canal designado.', flags: 64, });
        }

        // Mapear selecciones a roles
        const seleccionesRoles = {
            morado: 'Morado',
            rojo: 'Rojo',
            amarillo: 'Amarillo',
            azul: 'Azul',
            verde: 'Verde',
            rosa: 'Rosa',
            negro: 'Negro',
            naranja: 'Naranja',
        };

        const colorElegido = interaction.values[0]; // Obtener el color seleccionado
        const rolNombre = seleccionesRoles[colorElegido];

        if (!rolNombre) {
            return interaction.reply({ content: '❌ No se encontró un rol para la selección.', flags: 64, });
        }

        // Obtener el servidor (guild)
        const guild = interaction.guild;

        // Buscar el rol correspondiente
        let rol = guild.roles.cache.find(role => role.name === rolNombre);

        // Si el rol no existe, crearlo
        if (!rol) {
            try {
                rol = await guild.roles.create({
                    name: rolNombre,
                    color: getColorCode(colorElegido), // Asignar un color hexadecimal
                    reason: `Rol de color creado automáticamente para ${rolNombre}`,
                });
                console.log(`✅ Rol ${rolNombre} creado automáticamente.`);
            } catch (error) {
                console.error(`❌ No se pudo crear el rol ${rolNombre}:`, error);
                return interaction.reply({ content: '❌ No se pudo crear el rol. Contacta a un administrador.', flags: 64, });
            }
        }

        // Obtener el miembro del servidor
        const miembro = interaction.member;

        // Eliminar roles de colores anteriores
        const rolesDeColores = Object.values(seleccionesRoles);
        const rolesDelUsuario = miembro.roles.cache;

        rolesDeColores.forEach(async (nombreRol) => {
            const rolAnterior = rolesDelUsuario.find(role => role.name === nombreRol);
            if (rolAnterior) {
                try {
                    await miembro.roles.remove(rolAnterior);
                    console.log(`✅ Rol ${nombreRol} eliminado de ${miembro.user.tag}.`);
                } catch (error) {
                    console.error(`❌ No se pudo eliminar el rol ${nombreRol} de ${miembro.user.tag}:`, error);
                }
            }
        });

        // Asignar el nuevo rol
        try {
            await miembro.roles.add(rol);
            console.log(`✅ Se asignó el rol ${rolNombre} a ${miembro.user.tag}.`);
            await interaction.reply({ content: `✅ Se te ha asignado el rol **${rolNombre}**.`, flags: 64, });
        } catch (error) {
            console.error(`❌ No se pudo asignar el rol ${rolNombre} a ${miembro.user.tag}:`, error);
            await interaction.reply({ content: '❌ No se pudo asignar el rol. Contacta a un administrador.', flags: 64, });
        }
    },
};

// Función para obtener el código de color hexadecimal
function getColorCode(color) {
    const colors = {
        morado: '#800080',  // Morado
        rojo: '#FF0000',    // Rojo
        amarillo: '#FFFF00', // Amarillo
        azul: '#0000FF',    // Azul
        verde: '#00FF00',   // Verde
        rosa: '#FFC0CB',    // Rosa
        negro: '#000000',   // Negro
        naranja: '#FFA500', // Naranja
    };
    return colors[color] || '#FFFFFF'; // Blanco por defecto si el color no está definido
}const { Events, EmbedBuilder } = require('discord.js');
const pool = require('../database/db'); // Importa la conexión a MySQL

// Variables para el conteo
let siguienteNumero = 1; // El siguiente número que los usuarios deben escribir
const canalConteoId = '1335079673285316669'; // Reemplaza con el ID del canal de conteo

// Recompensas especiales
const recompensas = {
    50: 100,   // 100 Noxcoins por escribir 20
    100: 500,   // 500 Noxcoins por escribir 50
    200: 1000, // 1000 Noxcoins por escribir 100
};

module.exports = {
    name: Events.MessageCreate, // Evento que se activa cuando se envía un mensaje
    async execute(message) {
        // Ignorar mensajes de bots y mensajes que no sean en el canal de conteo
        if (message.author.bot || message.channelId !== canalConteoId) return;

        // Verificar si el mensaje es un número
        const numero = parseInt(message.content, 10);

        if (isNaN(numero)) {
            // Si no es un número, borrar el mensaje
            await message.delete();
            return;
        }

        // Verificar si el número es el correcto
        if (numero === siguienteNumero) {
            // Número correcto: reaccionar con 👍 y aumentar el contador
            await message.react('👍');
            siguienteNumero++;

            // Verificar si el número tiene una recompensa especial
            if (recompensas[numero]) {
                const cantidad = recompensas[numero];

                try {
                    // Verificar si el usuario ya tiene un registro en la base de datos
                    const [rows] = await pool.execute(
                        'SELECT noxcoins FROM economy WHERE user_id = ?',
                        [message.author.id]
                    );

                    if (rows.length === 0) {
                        // Si no existe, crear un nuevo registro
                        await pool.execute(
                            'INSERT INTO economy (user_id, noxcoins) VALUES (?, ?)',
                            [message.author.id, cantidad]
                        );
                    } else {
                        // Si existe, actualizar el saldo
                        await pool.execute(
                            'UPDATE economy SET noxcoins = noxcoins + ? WHERE user_id = ?',
                            [cantidad, message.author.id]
                        );
                    }

                    // Notificar al usuario sobre la recompensa
                    const embedRecompensa = new EmbedBuilder()
                        .setColor('#00FF00') // Color verde para indicar éxito
                        .setTitle('🎉 ¡Recompensa Especial!')
                        .setDescription(`¡Felicidades, ${message.author.username}! Has ganado **${cantidad} Noxcoins** por llegar al número **${numero}**.`)
                        .setFooter({ text: '¡Sigue participando para ganar más!' })
                        .setTimestamp(); // Agrega la hora actual

                    await message.reply({ embeds: [embedRecompensa] });
                } catch (error) {
                    console.error('❌ Error al actualizar el saldo:', error);
                    await message.reply('❌ Hubo un error al procesar tu recompensa. Por favor, inténtalo de nuevo más tarde.');
                }
            }
        } else {
            // Número incorrecto: notificar al usuario y borrar todos los mensajes del canal
            await message.reply(`❌ ¡Incorrecto! El siguiente número era **${siguienteNumero}**. Empezamos de nuevo.`);

            try {
                // Borrar todos los mensajes del canal (hasta 100 mensajes por lote)
                let mensajesBorrados = 0;
                let mensajes;
                do {
                    // Obtener hasta 100 mensajes
                    mensajes = await message.channel.messages.fetch({ limit: 100 });
                    if (mensajes.size > 0) {
                        await message.channel.bulkDelete(mensajes);
                        mensajesBorrados += mensajes.size;
                    }
                } while (mensajes.size === 100);

                console.log(`✅ Se borraron ${mensajesBorrados} mensajes del canal de conteo.`);
            } catch (error) {
                console.error('❌ Error al borrar los mensajes:', error);
            }

            // Reiniciar el conteo
            siguienteNumero = 1;
        }
    },
};module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        if (message.author.bot || !message.content.startsWith(client.config.prefix)) return;

        const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.prefixCommands.get(commandName);
        if (!command) return;

        try {
            command.execute(message, args, client);
        } catch (error) {
            console.error(error);
            message.reply('Hubo un error al ejecutar el comando.');
        }
    },
};
const os = require('os');
const diskusage = require('diskusage');

// Función para convertir bytes a MB/GB
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Función para obtener el uso de recursos
function getResourceUsage() {
    // Uso de CPU
    const cpuUsage = process.cpuUsage();
    const cpuUser = (cpuUsage.user / 1000).toFixed(2); // Tiempo de CPU en milisegundos
    const cpuSystem = (cpuUsage.system / 1000).toFixed(2);

    // Uso de memoria RAM
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Uso de almacenamiento
    const diskInfo = diskusage.checkSync('/'); // Cambia '/' por la ruta del disco que quieras monitorear
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
    name: 'monitor',
    execute(client) {
        setInterval(() => {
            const resources = getResourceUsage();
            console.log('--- Monitoreo de Recursos ---');
            console.log(`CPU: Usuario: ${resources.cpu.user} ms | Sistema: ${resources.cpu.system} ms`);
            console.log(`RAM: Total: ${resources.memory.total} | Usada: ${resources.memory.used} | Libre: ${resources.memory.free}`);
            console.log(`Almacenamiento: Total: ${resources.storage.total} | Libre: ${resources.storage.free}`);
            console.log('-----------------------------');
        }, 10000); // Muestra los recursos cada 10 segundos
    },
};const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.clear();

        const chalk = await import('chalk').then(m => m.default || m);
        const gradient = await import('gradient-string').then(m => m.default || m);
        const figlet = await import('figlet').then(m => m.default || m);
        const boxen = await import('boxen').then(m => m.default || m);

        // Cambiar el nombre de usuario del bot
        const customTag = "Nox✅";
        await client.user.setUsername(customTag);

        // Establecer la actividad del bot
        client.user.setActivity("Bot en programación, nos vemos pronto ❤️", {
            type: ActivityType.Custom,
        });

        // Generar el título con figlet
        figlet.text(client.user.username, {
            font: 'Standard',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.log('Error al generar el título:', err);
                return;
            }

            const title = gradient.rainbow(data);
            console.log(title);
        });

        // Mostrar información del bot
        const info = `
        🤖 ${chalk.green.bold('Nombre del bot:')} ${chalk.cyan.bold(client.user.tag)}
        🟢 ${chalk.green.bold('Estado:')} ${chalk.blue.bold(client.presence?.status || "Desconocido")}
        💻 ${chalk.green.bold('Servidores:')} ${chalk.yellow.bold(client.guilds.cache.size)}
        👥 ${chalk.green.bold('Usuarios:')} ${chalk.magenta.bold(client.users.cache.size)}
        `;

        const welcomeMessage = boxen(info, {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'cyan',
            backgroundColor: '#333'
        });

        console.log(welcomeMessage);

        // Mensaje adicional con gradient
        const additionalMessage = gradient.rainbow(`
        ¡El bot está listo y funcionando!
        ¡Gracias por usar este bot! 🚀
        `);

        console.log(additionalMessage);
    },
};const pool = require('../database/db'); // Ajusta la ruta según tu estructura

// Función para sincronizar las economías
async function syncEconomies() {
    try {
        const [linkedAccounts] = await pool.query('SELECT * FROM sync_economy');

        for (const account of linkedAccounts) {
            const [minecraftBalance] = await pool.query('SELECT balance FROM xconomy WHERE UID = ?', [account.minecraft_uuid]);
            const balance = minecraftBalance[0].balance;

            await pool.query('UPDATE discord_economy SET noxcoins = ? WHERE discord_id = ?', [balance, account.discord_id]);
        }

        console.log('Economías sincronizadas correctamente.');
    } catch (error) {
        console.error('Error al sincronizar economías:', error);
    }
}

// Exportar la función como un evento
module.exports = (client) => {
    // Ejecutar la función cada 5 segundos (5000 ms)
    setInterval(async () => {
        await syncEconomies();
    }, 5000);
};const { PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Events } = require('discord.js');
const config = require('../config.json');
const ticketData = new Map(); // Usa Map para almacenar datos de tickets
const pool = require('../database/db'); // Conexión a MySQL

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // Ejecutar el comando
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            return; // Importante: Detener la ejecución después de un comando
        }

        if (interaction.isButton()) {
            try {
                await handleButtonInteraction(interaction); // Función para manejar botones
            } catch (error) {
                console.error("Error handling button interaction:", error);
                await interaction.reply({ content: 'Ocurrió un error al procesar este botón.', ephemeral: true });
            }
        }
    },
};

async function handleButtonInteraction(interaction) {
    if (interaction.customId === 'create_ticket') {
        const existingChannel = interaction.guild.channels.cache.find(
            (channel) => channel.name === `ticket-${interaction.user.id}`
        );

        if (existingChannel) {
            return interaction.reply({ content: 'Ya tienes un ticket abierto.', ephemeral: true });
        }

        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: ChannelType.GuildText,
                parent: config.ticketCategoryID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: config.supportRoleID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('Ticket de Soporte')
                .setDescription('Utiliza los botones de abajo para **reclamar** o **cerrar** este ticket.')
                .setColor(0x0099ff)
                .setFooter({ text: `Ticket abierto por ${interaction.user.tag}` })
                .setTimestamp();

            const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Reclamar Ticket')
                .setStyle(ButtonStyle.Success);

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

            const ticketMessage = await channel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [ticketEmbed],
                components: [row]
            });

            ticketData.set(channel.id, {
                opener: interaction.user.id,
                createdAt: Date.now(),
                claimedBy: null,
                claimAt: null,
                ticketMessageId: ticketMessage.id
            });

            await interaction.reply({ content: `Ticket creado: ${channel}`, ephemeral: true });

        } catch (err) {
            console.error(err);
            interaction.reply({ content: 'Hubo un error al crear el ticket.', ephemeral: true });
        }
    }

    if (interaction.customId === 'claim_ticket') {
        if (!interaction.member.roles.cache.has(config.supportRoleID)) {
            return interaction.reply({ content: 'Solo el staff puede reclamar tickets.', ephemeral: true });
        }

        const data = ticketData.get(interaction.channel.id);
        if (!data) return interaction.reply({ content: 'Información del ticket no encontrada.', ephemeral: true });

        if (data.claimedBy) {
            return interaction.reply({ content: 'Este ticket ya fue reclamado.', ephemeral: true });
        }

        data.claimedBy = interaction.user.id;
        data.claimAt = Date.now();
        ticketData.set(interaction.channel.id, data);

        try {
            const ticketMessage = await interaction.channel.messages.fetch(data.ticketMessageId);
            const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
                .setDescription('Este ticket ha sido **reclamado** por el staff.')
                .addFields({ name: 'Reclamado por', value: `<@${interaction.user.id}>`, inline: true })
                .setColor(0x00ff00);
            await ticketMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            console.error('Error al editar el embed del ticket:', error);
        }

        return interaction.reply({ content: 'Ticket reclamado exitosamente.', ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        const data = ticketData.get(interaction.channel.id);
        if (!data) {
            return interaction.reply({ content: 'Información del ticket no encontrada.', ephemeral: true });
        }

        if (interaction.user.id !== data.opener && !interaction.member.roles.cache.has(config.supportRoleID)) {
            return interaction.reply({ content: 'No tienes permisos para cerrar este ticket.', ephemeral: true });
        }

        await interaction.reply({ content: 'El ticket se cerrará en 5 segundos...', ephemeral: true });

        const logEmbed = new EmbedBuilder()
            .setTitle('Ticket Cerrado')
            .setColor(0xff0000)
            .addFields(
                { name: 'Abierto por', value: `<@${data.opener}>`, inline: true },
                { name: 'Reclamado por', value: data.claimedBy ? `<@${data.claimedBy}>` : 'No reclamado', inline: true },
                { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

        const logChannel = interaction.guild.channels.cache.get(config.ticketLogChannelID);
        if (logChannel) {
            logChannel.send({ embeds: [logEmbed] });
        } else {
            console.error('Canal de logs no encontrado en la configuración.');
        }

        setTimeout(() => {
            ticketData.delete(interaction.channel.id);
            interaction.channel.delete().catch((err) => console.error('Error al eliminar el canal:', err));
        }, 5000);
    }
}const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageCreate', // Nombre del evento
  async execute(message) {
    // Ignorar mensajes del bot
    if (message.author.bot) return;

    // Verificar si el bot fue etiquetado
    if (!message.mentions.users.has(message.client.user.id)) return;

    // Crear embed con información del bot
    const embed = new EmbedBuilder()
      .setTitle('¡Hola!')
      .setDescription('Gracias por etiquetarme. Aquí tienes información sobre mí y una invitación a nuestro servidor.')
      .addFields(
        { name: 'Invitación al soporte del bot', value: '[Únete a nuestro servidor](https://discord.gg/tulinkdeservidor)' }, // Reemplaza con tu link de servidor
        { name: 'Comandos', value: 'Usa `/help` para ver la lista de comandos disponibles.' }
      )
      .setColor('Blue');

    // Enviar mensaje de respuesta
    await message.reply({ embeds: [embed] });
  },
};const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (interaction.customId !== 'iniciar_verificacion') return;

        try {
            // Asegura que la interacción no expire antes de responder
            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle('Pregunta de Verificación')
                .setDescription('¿Cuál es la capital de Francia?')
                .setColor(0x00AE86);

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('respuesta_1')
                        .setLabel('Londres')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('respuesta_2')
                        .setLabel('París')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('respuesta_3')
                        .setLabel('Madrid')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('respuesta_4')
                        .setLabel('Berlín')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('respuesta_5')
                        .setLabel('Roma')
                        .setStyle(ButtonStyle.Secondary),
                );

            // Edita la respuesta diferida con el embed y los botones
            await interaction.editReply({ embeds: [embed], components: [buttons] });

        } catch (error) {
            console.error("❌ Error en la interacción:", error);
        }
    },
};
const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('respuesta_')) return;

        // IDs de los roles
        const verificationRoleId = '1337257863730696242'; // Rol de verificación
        const userRoleId = '1328557869599297590'; // Rol definitivo (Usuario)

        // Respuesta correcta (en este caso, "respuesta_2" es la correcta)
        const correctAnswer = 'respuesta_2'; // Cambia esto según tu pregunta

        // Verificar si la respuesta es correcta
        if (interaction.customId === correctAnswer) {
            try {
                // Obtener el miembro (usuario) que interactuó
                const member = interaction.member;

                // Quitar el rol de verificación
                const verificationRole = interaction.guild.roles.cache.get(verificationRoleId);
                if (verificationRole) {
                    await member.roles.remove(verificationRole);
                    console.log(`Rol de verificación removido de ${member.user.tag}`);
                } else {
                    console.error(`No se encontró el rol de verificación con ID: ${verificationRoleId}`);
                    return await interaction.reply({ content: 'Hubo un error al procesar tu verificación. Por favor, contacta a un administrador.', ephemeral: true });
                }

                // Asignar el rol definitivo (Usuario)
                const userRole = interaction.guild.roles.cache.get(userRoleId);
                if (userRole) {
                    await member.roles.add(userRole);
                    console.log(`Rol definitivo asignado a ${member.user.tag}`);
                } else {
                    console.error(`No se encontró el rol definitivo con ID: ${userRoleId}`);
                    return await interaction.reply({ content: 'Hubo un error al procesar tu verificación. Por favor, contacta a un administrador.', ephemeral: true });
                }

                // Responder al usuario que ha sido verificado
                await interaction.reply({ content: '¡Respuesta correcta! Has sido verificado.', ephemeral: true });
            } catch (error) {
                console.error('Error al manejar la verificación:', error);
                await interaction.reply({ content: 'Hubo un error al procesar tu verificación. Por favor, contacta a un administrador.', ephemeral: true });
            }
        } else {
            // Respuesta incorrecta
            await interaction.reply({ content: 'Respuesta incorrecta. Inténtalo de nuevo.', ephemeral: true });
        }
    },
};const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // ID del rol de verificación
        const verificationRoleId = '1337257863730696242';

        // Buscar el rol de verificación en la guild
        const verificationRole = member.guild.roles.cache.get(verificationRoleId);

        if (!verificationRole) {
            console.error(`No se encontró el rol de verificación con ID: ${verificationRoleId}`);
            return;
        }

        try {
            // Asignar el rol de verificación al nuevo miembro
            await member.roles.add(verificationRole);
            console.log(`Rol de verificación asignado a ${member.user.tag}`);
        } catch (error) {
            console.error(`Error al asignar el rol de verificación a ${member.user.tag}:`, error);
        }
    },
};