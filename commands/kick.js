module.exports = {
    name: 'kick',
    async execute(message) {
        if (!message.member.permissions.has('KickMembers'))
            return message.reply('Sem permissão.');

        const user = message.mentions.members.first();
        if (!user) return message.reply('Mencione alguém.');

        user.kick();
        message.channel.send('Usuário expulso.');
    }
};