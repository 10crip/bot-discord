const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'painelpost',

    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚀 Central de Postagens')
            .setDescription(
                'Compartilhe algo incrível com a comunidade!\n\n' +
                '📸 Poste imagens ou vídeos\n' +
                '📝 Adicione um título chamativo\n' +
                '🔥 Destaque-se no servidor\n\n' +
                '💡 Clique no botão abaixo para começar.'
            )
            .addFields(
                {
                    name: '📌 Como funciona?',
                    value:
                        '• Você envia no privado\n' +
                        '• A staff analisa\n' +
                        '• Se aprovado, será publicado',
                    inline: false
                }
            )
            .setFooter({
                text: 'Sistema de Postagens • Seja criativo ✨'
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_postagem')
                .setLabel('Criar Postagem')
                .setEmoji('🚀')
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
