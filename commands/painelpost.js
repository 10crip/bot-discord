const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'painelpost',

    async execute(message) {
        try {
            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('📢 Sistema de Postagens')
                .setDescription(
                    'Bem-vindo ao Sistema de Postagens.\n\n' +
                    'Clique no botão abaixo para iniciar o envio de uma postagem.\n\n' +
                    '📩 O bot continuará o processo no seu privado.\n' +
                    '📝 Você poderá enviar título e mídia.\n' +
                    '✅ A postagem será enviada para aprovação no canal configurado.\n\n' +
                    'Aguarde a análise da equipe.'
                )
                .setFooter({ text: 'Sistema de Postagens' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_postagem')
                    .setLabel('POSTING')
                    .setStyle(ButtonStyle.Success)
            );

            await message.channel.send({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Erro ao enviar painel de postagem:', error);
            await message.reply('❌ Ocorreu um erro ao enviar o painel de postagem.');
        }
    }
};
