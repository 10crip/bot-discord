const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'kick',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('❌ Você não tem permissão para expulsar membros.');
        }

        const user = message.mentions.members.first();
        const motivo = args.slice(1).join(' ') || 'Sem motivo informado';

        if (!user) {
            return message.reply('❌ Mencione um usuário para expulsar.');
        }

        if (!user.kickable) {
            return message.reply('❌ Não consigo expulsar esse usuário.');
        }

        try {
            await user.kick(motivo);

            const embed = new EmbedBuilder()
                .setTitle('👢 Usuário expulso')
                .addFields(
                    { name: 'Usuário', value: `${user.user.tag}`, inline: true },
                    { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                    { name: 'Motivo', value: motivo }
                )
                .setColor('Orange');

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao expulsar o usuário.');
        }
    }
};
