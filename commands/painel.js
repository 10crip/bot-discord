const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

require('dotenv').config();

module.exports = {
    name: 'painel',

    async execute(message) {

        const cargoStaff = process.env.CARGO_STAFF;

        // Verificar permissão
        if (!message.member.roles.cache.has(cargoStaff)) {
            return message.reply({
                content: '❌ Você não tem permissão para usar este comando.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Suporte')
            .setDescription(
                'Escolha uma opção abaixo para abrir um ticket:\n\n' +
                '🔧 **Suporte**\n' +
                '🤝 **Parceria**'
            )
            .setColor('#2b2d31')
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
