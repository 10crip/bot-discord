const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} = require('discord.js');

require('dotenv').config();

module.exports = {
    name: 'painelpost',

    async execute(message) {

        const cargoStaff = process.env.CARGO_STAFF;

        // Verificar permissão
        if (!message.member.roles.cache.has(cargoStaff)) {
            return message.reply({
                content: '❌ Você não tem permissão para usar este comando.'
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📢 Sistema de Postagens')
            .setDescription(
                'Clique no botão abaixo para enviar uma postagem.\n\n' +
                '📩 O bot irá te chamar no privado.'
            )
            .setColor('#5865F2')
            .setFooter({ text: 'Sistema de Postagem com Aprovação' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('posting_iniciar')
                .setLabel('POSTING')
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
