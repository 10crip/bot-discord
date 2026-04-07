const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { memberHasStaffRole } = require('../guildConfig');

module.exports = {
    name: 'painel',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!memberHasStaffRole(message.member)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Suporte')
            .setColor('#2B2D31')
            .setDescription(
                [
                    'Bem-vindo à **Central de Suporte**.',
                    '',
                    'Selecione uma das opções abaixo para abrir seu atendimento:',
                    '',
                    '🔧 **Suporte** → Para dúvidas, ajuda ou problemas.',
                    '🤝 **Parceria** → Para propostas e parcerias.',
                    '',
                    'Nossa equipe irá atender você assim que possível.'
                ].join('\n')
            )
            .setFooter({ text: 'Sistema de Tickets' })
            .setTimestamp();

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
