const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { isStaff } = require('../utils/staff');

module.exports = {
    name: 'painel',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!isStaff(message.member, message.guild.id)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Suporte')
            .setColor('#2B2D31')
            .setDescription(
                [
                    'Selecione uma opção abaixo para abrir um ticket:',
                    '',
                    '🔧 **Suporte**',
                    '🤝 **Parceria**'
                ].join('\n')
            )
            .setFooter({ text: 'Sistema de Tickets' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_suporte')
                .setLabel('Suporte')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_parceria')
                .setLabel('Parceria')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
