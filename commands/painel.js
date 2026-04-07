const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'painel',

    async execute(message) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🎧 Central de Atendimento Premium')
                .setDescription(
                    'Precisa de ajuda ou quer falar com nossa equipe?\n\n' +
                    'Selecione abaixo a opção ideal para abrir seu atendimento.\n\n' +
                    '⚡ Resposta rápida\n' +
                    '🔒 Atendimento privado\n' +
                    '👨‍💼 Suporte direto da equipe'
                )
                .addFields(
                    {
                        name: '🛠️ Suporte',
                        value: 'Dúvidas, problemas, bugs ou ajuda geral no servidor.',
                        inline: true
                    },
                    {
                        name: '🤝 Parceria',
                        value: 'Propostas, divulgação, collabs e parcerias.',
                        inline: true
                    },
                    {
                        name: '📌 Aviso',
                        value: 'Abra apenas um ticket por assunto para manter o atendimento organizado.',
                        inline: false
                    }
                )
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({
                    text: `${message.guild.name} • Atendimento oficial`
                })
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
        } catch (error) {
            console.error('Erro ao enviar painel de ticket:', error);
            await message.reply('❌ Ocorreu um erro ao enviar o painel.');
        }
    }
};
