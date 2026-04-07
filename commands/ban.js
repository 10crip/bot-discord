const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ban',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('❌ Você não tem permissão para banir membros.');
        }

        const user = message.mentions.members.first();
        const motivo = args.slice(1).join(' ') || 'Sem motivo informado';

        if (!user) {
            return message.reply('❌ Mencione um usuário para banir.');
        }

        if (!user.bannable) {
            return message.reply('❌ Não consigo banir esse usuário.');
        }

        try {
            await user.ban({ reason: motivo });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Usuário banido')
                .addFields(
                    { name: 'Usuário', value: `${user.user.tag}`, inline: true },
                    { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                    { name: 'Motivo', value: motivo }
                )
                .setColor('DarkRed');

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao banir o usuário.');
        }
    }
};
