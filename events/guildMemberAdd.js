module.exports = {
    name: 'guildMemberAdd',
    execute(member) {
        const canal = member.guild.systemChannel;
        if (canal) {
            canal.send(`👋 Bem-vindo ${member}!`);
        }
    }
};