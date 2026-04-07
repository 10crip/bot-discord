const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

const PANEL_CHANNEL_ID = '1491204291887763599';
const BUTTON_ID = 'criar_sua_call';

module.exports = {
    name: 'painelcall',

    async execute(message) {
        try {
            if (!message.guild) return;

            const hasManageChannels = message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            const hasAdministrator = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!hasManageChannels && !hasAdministrator) {
                const reply = await message.reply('❌ Você não tem permissão para enviar este painel.');
                setTimeout(() => reply.delete().catch(() => null), 20000);
                return;
            }

            const panelChannel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);

            if (!panelChannel || !panelChannel.isTextBased()) {
                const reply = await message.reply('❌ O canal do painel não foi encontrado.');
                setTimeout(() => reply.delete().catch(() => null), 20000);
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎙️ Crie sua call')
                .setDescription(
                    [
                        'Clique no botão abaixo para criar sua call.',
                        '',
                        'Você poderá configurar:',
                        '• nome da call',
                        '• quantidade de membros'
                    ].join('\n')
                )
                .setFooter({
                    text: 'Sistema de calls'
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(BUTTON_ID)
                    .setLabel('Crie sua call')
                    .setEmoji('🎧')
                    .setStyle(ButtonStyle.Primary)
            );

            await panelChannel.send({
                embeds: [embed],
                components: [row]
            });

            const reply = await message.reply(`✅ Painel enviado com sucesso em <#${PANEL_CHANNEL_ID}>.`);
            setTimeout(() => reply.delete().catch(() => null), 20000);

            await message.delete().catch(() => null);
        } catch (error) {
            console.error('Erro no comando painelcall:', error);

            const reply = await message.reply('❌ Ocorreu um erro ao enviar o painel de call.').catch(() => null);
            if (reply) {
                setTimeout(() => reply.delete().catch(() => null), 20000);
            }
        }
    }
};