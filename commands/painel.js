const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'painel',

    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🎧 Central de Atendimento Premium')
            .setDescription(
                'Bem-vindo à nossa central de suporte.\n\n' +
                'Selecione abaixo o tipo de atendimento que você deseja abrir.\n\n' +
                '✨ Atendimento organizado\n' +
                '🔒 Canal privado e seguro\n' +
                '⚡ Resposta direta da equipe'
            )
            .addFields(
                {
                    name: '🛠️ Suporte',
                    value: 'Para dúvidas, problemas, bugs ou ajuda geral no servidor.',
                    inline: true
                },
                {
                    name: '🤝 Parceria',
                    value: 'Para propostas comerciais, divulgação e parcerias.',
                    inline: true
                },
                {
                    name: '📌 Importante',
                    value: 'Evite abrir mais de um atendimento para o mesmo assunto.',
                    inline: false
                }
            )
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `${message.guild.name} • Atendimento oficial` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_ticket_suporte')
                .setLabel('Abrir Suporte')
                .setEmoji('🛠️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('abrir_ticket_parceria')
                .setLabel('Abrir Parceria')
                .setEmoji('🤝')
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
