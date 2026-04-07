const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

const CANAL_PAINEL_ID = '1490936815228555274';

module.exports = {
    name: 'painel',
    async execute(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Você não tem permissão para enviar o painel.');
        }

        if (message.channel.id !== CANAL_PAINEL_ID) {
            return message.reply(`❌ Use este comando no canal <#${CANAL_PAINEL_ID}>.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Atendimento')
            .setDescription(
                'Escolha uma opção abaixo para abrir seu ticket.\n\n' +
                '🔧 **Suporte**\n' +
                '🤝 **Parceria**'
            )
            .setColor('Red');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_ticket_suporte')
                .setLabel('Suporte')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('abrir_ticket_parceria')
                .setLabel('Parceria')
                .setStyle(ButtonStyle.Success)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        await message.reply('✅ Painel enviado com sucesso.');
    }
};
