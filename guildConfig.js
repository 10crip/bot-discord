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
        console.error('Erro ao ler configs:', error);
        return {};
    }
}

function saveConfigs(configs) {
    ensureFile();
    try {
        fs.writeFileSync(filePath, JSON.stringify(configs, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar configs:', error);
    }
}

function getGuildConfig(guildId) {
    const configs = readConfigs();

    if (!configs[guildId]) {
        configs[guildId] = {
            staffRoles: [],
            postApprovalChannelId: null
        };
        saveConfigs(configs);
    }

    return configs[guildId];
}

function setGuildConfig(guildId, newConfig) {
    const configs = readConfigs();

    configs[guildId] = {
        ...getGuildConfig(guildId),
        ...newConfig
    };

    saveConfigs(configs);
    return configs[guildId];
}

function setPostApprovalChannel(guildId, channelId) {
    return setGuildConfig(guildId, {
        postApprovalChannelId: channelId
    });
}

function getPostApprovalChannel(guildId) {
    return getGuildConfig(guildId).postApprovalChannelId;
}

function addStaffRole(guildId, roleId) {
    const config = getGuildConfig(guildId);

    if (!config.staffRoles.includes(roleId)) {
        config.staffRoles.push(roleId);
    }

    return setGuildConfig(guildId, config);
}

function getStaffRoles(guildId) {
    return getGuildConfig(guildId).staffRoles || [];
}

function memberHasStaffRole(member) {
    const roles = getStaffRoles(member.guild.id);
    return member.roles.cache.some(r => roles.includes(r.id));
}

module.exports = {
    getGuildConfig,
    setGuildConfig,
    setPostApprovalChannel,
    getPostApprovalChannel,
    addStaffRole,
    getStaffRoles,
    memberHasStaffRole
};