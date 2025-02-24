const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
        const memberCountChannel = member.guild.channels.cache.get(config.channels.memberCount);

        if (!welcomeChannel) return;

        try {
            // Crear canvas para la imagen de bienvenida
            const canvas = createCanvas(700, 700);
            const ctx = canvas.getContext('2d');

            // Cargar y dibujar fondo
            const background = await loadImage(path.join(__dirname, '../../assets/welcome-bg.png'));
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Configurar texto de bienvenida
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Bienvenidos a Noxium', canvas.width / 2, 50);

            // Dibujar avatar
            const avatar = await loadImage(member.user.displayAvatarURL({ format: 'png', size: 256 }));
            const avatarSize = 220;
            const avatarX = canvas.width / 4 - 45;
            const avatarY = 140;

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize, avatarY + avatarSize, avatarSize, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize * 2, avatarSize * 2);
            ctx.restore();

            // Crear embed de bienvenida
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' });
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`¡Bienvenido a ${member.guild.name}!`)
                .setDescription(`¡Hola ${member}, esperamos que disfrutes tu tiempo aquí!`)
                .setImage('attachment://welcome.png')
                .setFooter({ text: `Miembro ${member.guild.memberCount}` })
                .addFields([
                    { 
                        name: 'Es hora de empezar tu nueva aventura', 
                        value: 'Aquí encontrarás loterías, juegos y más para ganar Noxcoins que te servirán dentro del servidor Noxium.' 
                    },
                    {
                        name: 'Revisa nuestros canales',
                        value: 'No olvides leer las reglas y diviértete en nuestro servidor.'
                    }
                ]);

            await welcomeChannel.send({ embeds: [embed], files: [attachment] });

            // Actualizar canal de contador de miembros
            if (memberCountChannel) {
                await memberCountChannel.setName(`👥 Miembros: ${member.guild.memberCount}`);
            }

        } catch (error) {
            console.error('Error en evento guildMemberAdd:', error);
        }
    }
};