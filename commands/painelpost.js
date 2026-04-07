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
                    'Clique no botão abaixo para iniciar sua postagem.\n\n' +
                    '📩 O bot continuará o processo no seu privado.'
                );

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
            console.error('Erro ao enviar painelpost:', error);
            await message.reply('❌ Erro ao enviar o painel.');
        }
    }
};
