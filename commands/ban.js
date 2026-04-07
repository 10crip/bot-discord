module.exports = {
    name: 'ban',
    async execute(message) {
        if (!message.member.permissions.has('BanMembers'))
            return message.reply('Sem permissão.');

        const user = message.mentions.members.first();
        if (!user) return message.reply('Mencione alguém.');

        user.ban();
        message.channel.send('Usuário banido.');
    }
};