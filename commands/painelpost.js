const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { isStaff } = require('../utils/staff');

module.exports = {
    name: 'painelpost',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!isStaff(message.member, message.guild.id)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📢 Sistema de Postagens')
            .setColor('#5865F2')
            .setDescription(
                [
                    'Clique no botão abaixo para iniciar uma postagem.',
                    '',
                    '📩 O bot irá te chamar no privado para coletar:',
                    '• título',
                    '• imagem ou vídeo'
                ].join('\n')
            )
            .setFooter({ text: 'Postagens com aprovação manual' });

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
