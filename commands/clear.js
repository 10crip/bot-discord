module.exports = {
    name: 'clear',
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages'))
            return message.reply('Sem permissão.');

        const quantidade = parseInt(args[0]);
        if (!quantidade) return message.reply('Digite um número.');

        await message.channel.bulkDelete(quantidade, true);
    }
};