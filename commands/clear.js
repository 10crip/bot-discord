const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Você não tem permissão para apagar mensagens.');
        }

        const quantidade = parseInt(args[0]);

        if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
            return message.reply('❌ Use um número entre 1 e 100.');
        }

        try {
            await message.channel.bulkDelete(quantidade, true);

            const embed = new EmbedBuilder()
                .setTitle('🧹 Mensagens apagadas')
                .setDescription(`Foram apagadas **${quantidade}** mensagens.`)
                .setColor('Red');

            const msg = await message.channel.send({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => {}), 3000);
        } catch (error) {
            console.error(error);
            message.reply('❌ Não consegui apagar as mensagens.');
        }
    }
};
