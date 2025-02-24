const { Events } = require('discord.js');
const { hasPermission } = require('../utils/permissionsManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Ignorar si no es un menú de selección
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'select-color') return;

        // Verificar si la interacción es en el canal correcto
        const canalDesignado = interaction.client.config.channels.colorSelection;
        if (interaction.channelId !== canalDesignado) {
            return interaction.reply({ 
                content: '❌ Este comando solo puede usarse en el canal designado.',
                ephemeral: true 
            });
        }

        // Verificar permisos del usuario
        if (!hasPermission(interaction.guild.id, interaction.member, 'colors')) {
            return interaction.reply({
                content: '❌ No tienes permiso para usar este comando.',
                ephemeral: true
            });
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

        const colorElegido = interaction.values[0];
        const rolNombre = seleccionesRoles[colorElegido];

        if (!rolNombre) {
            return interaction.reply({ 
                content: '❌ No se encontró un rol para la selección.',
                ephemeral: true 
            });
        }

        // Buscar el rol correspondiente
        let rol = interaction.guild.roles.cache.find(role => role.name === rolNombre);

        // Si el rol no existe, crearlo
        if (!rol) {
            try {
                rol = await interaction.guild.roles.create({
                    name: rolNombre,
                    color: getColorCode(colorElegido),
                    reason: `Rol de color creado automáticamente para ${rolNombre}`,
                });
            } catch (error) {
                console.error(`❌ No se pudo crear el rol ${rolNombre}:`, error);
                return interaction.reply({ 
                    content: '❌ No se pudo crear el rol. Contacta a un administrador.',
                    ephemeral: true 
                });
            }
        }

        // Obtener el miembro del servidor
        const miembro = interaction.member;

        // Eliminar roles de colores anteriores
        const rolesDeColores = Object.values(seleccionesRoles);
        const rolesDelUsuario = miembro.roles.cache;

        for (const nombreRol of rolesDeColores) {
            const rolAnterior = rolesDelUsuario.find(role => role.name === nombreRol);
            if (rolAnterior) {
                try {
                    await miembro.roles.remove(rolAnterior);
                } catch (error) {
                    console.error(`❌ No se pudo eliminar el rol ${nombreRol} de ${miembro.user.tag}:`, error);
                }
            }
        }

        // Asignar el nuevo rol
        try {
            await miembro.roles.add(rol);
            await interaction.reply({ 
                content: `✅ Se te ha asignado el rol **${rolNombre}**.`,
                ephemeral: true 
            });
        } catch (error) {
            console.error(`❌ No se pudo asignar el rol ${rolNombre} a ${miembro.user.tag}:`, error);
            await interaction.reply({ 
                content: '❌ No se pudo asignar el rol. Contacta a un administrador.',
                ephemeral: true 
            });
        }
    },
};

// Función para obtener el código de color hexadecimal
function getColorCode(color) {
    const colors = {
        morado: '#800080',
        rojo: '#FF0000',
        amarillo: '#FFFF00',
        azul: '#0000FF',
        verde: '#00FF00',
        rosa: '#FFC0CB',
        negro: '#000000',
        naranja: '#FFA500',
    };
    return colors[color] || '#FFFFFF';
}