// src/events/colorSelection.js

const {
    hasPermission
} = require('../utils/permissionsManager');

async function handleSelectMenu(interaction) {
    const canalDesignado = interaction.client.config.channels.colorSelection;
    if (interaction.channelId !== canalDesignado) {
        return interaction.reply({
            content: '❌ Este comando solo puede usarse en el canal designado.',
            ephemeral: true
        });
    }

    if (!hasPermission(interaction.guild.id, interaction.member, 'colors')) {
        return interaction.reply({
            content: '❌ No tienes permiso para usar este comando.',
            ephemeral: true
        });
    }

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
    const rol = interaction.guild.roles.cache.find(r => r.name === rolNombre);
    const miembro = interaction.guild.members.cache.get(interaction.user.id);

    if (!rol) {
        return interaction.reply({
            content: `❌ No se encontró el rol **${rolNombre}**.`,
            ephemeral: true
        });
    }

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
}

function handleButton(interaction) {
    // Si tienes botones en el sistema de colores, agrega la lógica aquí.
    interaction.reply({
        content: 'Este botón no tiene una función asignada.',
        ephemeral: true
    });
}

module.exports = {
    handleSelectMenu,
    handleButton,
};