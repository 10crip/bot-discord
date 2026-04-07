const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'guildConfigs.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readConfigs() {
    ensureFile();

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Erro ao ler guildConfigs.json:', error);
        return {};
    }
}

function saveConfigs(configs) {
    ensureFile();

    try {
        fs.writeFileSync(filePath, JSON.stringify(configs, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar guildConfigs.json:', error);
    }
}

function createDefaultGuildConfig() {
    return {
        staffRoles: [],
        postApprovalChannelId: null
    };
}

function getGuildConfig(guildId) {
    const configs = readConfigs();

    if (!configs[guildId]) {
        configs[guildId] = createDefaultGuildConfig();
        saveConfigs(configs);
    }

    return configs[guildId];
}

function setGuildConfig(guildId, newConfig) {
    const configs = readConfigs();

    configs[guildId] = {
        ...createDefaultGuildConfig(),
        ...configs[guildId],
        ...newConfig
    };

    saveConfigs(configs);
    return configs[guildId];
}

function setPostApprovalChannel(guildId, channelId) {
    const guildConfig = getGuildConfig(guildId);
    guildConfig.postApprovalChannelId = channelId;
    return setGuildConfig(guildId, guildConfig);
}

function getPostApprovalChannel(guildId) {
    const guildConfig = getGuildConfig(guildId);
    return guildConfig.postApprovalChannelId;
}

function setStaffRoles(guildId, roleIds = []) {
    const guildConfig = getGuildConfig(guildId);
    guildConfig.staffRoles = Array.isArray(roleIds) ? [...new Set(roleIds)] : [];
    return setGuildConfig(guildId, guildConfig);
}

function addStaffRole(guildId, roleId) {
    const guildConfig = getGuildConfig(guildId);

    if (!guildConfig.staffRoles.includes(roleId)) {
        guildConfig.staffRoles.push(roleId);
    }

    return setGuildConfig(guildId, guildConfig);
}

function removeStaffRole(guildId, roleId) {
    const guildConfig = getGuildConfig(guildId);
    guildConfig.staffRoles = guildConfig.staffRoles.filter(id => id !== roleId);
    return setGuildConfig(guildId, guildConfig);
}

function getStaffRoles(guildId) {
    const guildConfig = getGuildConfig(guildId);
    return guildConfig.staffRoles || [];
}

function memberHasStaffRole(member) {
    if (!member || !member.guild) return false;

    const staffRoles = getStaffRoles(member.guild.id);

    if (!staffRoles.length) return false;

    return member.roles.cache.some(role => staffRoles.includes(role.id));
}

module.exports = {
    getGuildConfig,
    setGuildConfig,
    setPostApprovalChannel,
    getPostApprovalChannel,
    setStaffRoles,
    addStaffRole,
    removeStaffRole,
    getStaffRoles,
    memberHasStaffRole
};
