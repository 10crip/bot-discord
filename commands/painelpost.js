const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { memberHasStaffRole } = require('../guildConfig');

module.exports = {
    name: 'painelpost',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!memberHasStaffRole(message.member)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📢 Sistema de Postagens')
            .setColor('#5865F2')
            .setDescription(
                [
                    'Bem-vindo ao **Sistema de Postagens**.',
                    '',
                    'Clique no botão abaixo para enviar sua postagem.',
                    '',
                    '📩 O bot irá iniciar o processo no seu privado.',
                    '📝 Você poderá enviar título e mídia (imagem ou vídeo).',
                    '✅ Sua postagem será enviada para aprovação.',
                    '',
                    'Aguarde a análise da equipe.'
                ].join('\n')
            )
            .setFooter({ text: 'Sistema de Postagens com Aprovação' })
            .setTimestamp();

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
