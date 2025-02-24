const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const channel = member.guild.channels.cache.get('1328557870144426048'); // Canal de bienvenida
        const memberCountChannel = member.guild.channels.cache.get('1337234406884249732'); // Canal de contador de miembros
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

            // Crear la imagen adjunta
            const attachment = new AttachmentBuilder(cnv.toBuffer('image/png'), { name: 'welcome.png' });

            // Crear el embed de bienvenida
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`¡Bienvenido a ${member.guild.name}!`)
                .setDescription(`¡Hola ${member}, esperamos que disfrutes tu tiempo aquí!`)
                .setImage('attachment://welcome.png')
                .setFooter({ text: `Miembro ${member.guild.memberCount}` })
                .addFields([
                    { name: 'Es hora de empezar tu nueva aventura', value: 'Aquí encontrarás loterías, juegos y más para ganar Noxcoins que te servirán dentro del servidor Noxium.' },
                    { name: '```!IMPORTANTE!```', value: '```Lee las normas y por favor respétalas.``` https://discord.com/channels/1328557869599297587/1328557870144426049' }
                ]);

            // Enviar el mensaje de bienvenida
            await channel.send({ embeds: [embed], files: [attachment] });

            // Actualizar el canal de conteo de miembros
            if (memberCountChannel) {
                try {
                    await memberCountChannel.setName(`👥 Miembros: ${member.guild.memberCount}`);
                } catch (error) {
                    console.error('Error al actualizar el nombre del canal:', error);
                }
            }
        } catch (error) {
            console.error('Error al generar la imagen de bienvenida:', error);
        }
    },
};