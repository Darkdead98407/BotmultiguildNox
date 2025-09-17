const { getGuildConfig, setGuildConfig } = require('./guildDataManager');

async function hasPermission(guildId, member, permissionType) {
    if (member.permissions.has('ADMINISTRATOR')) return true;
    
    const guildConfig = await getGuildConfig(guildId) || {};
    const permRoles = guildConfig[`${permissionType}Roles`] || [];
    
    return member.roles.cache.some(role => permRoles.includes(role.id));
}

async function addPermission(guildId, roleId, type) {
    const guildConfig = await getGuildConfig(guildId) || {};
    const permKey = `${type}Roles`;
    
    if (!guildConfig[permKey]) {
        guildConfig[permKey] = [];
    }
    
    if (!guildConfig[permKey].includes(roleId)) {
        guildConfig[permKey].push(roleId);
        await setGuildConfig(guildId, guildConfig);
    }
}

module.exports = {
    hasPermission,
    addPermission
};
