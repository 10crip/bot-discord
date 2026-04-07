const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const { memberHasStaffRole } = require('../guildConfig');
const { approvePost, rejectPost } = require('../utils/postApprovalSystem');
const {
    getPostRecord,
    toggleLike,
    addComment,
    buildCommentsEmbed,
    refreshPostButtons
} = require('../utils/postInteractions');

const TICKET_CATEGORY_ID = '1490905371601145939';

// =====================
// RESPOSTA TEMPORÁRIA
// =====================
async function replyTemp(interaction, payload) {
    const data = { ...payload, ephemeral: true };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(data).catch(() => {});
    } else {
        await interaction.reply(data).catch(() => {});
    }

    setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
    }, 25000);
}

module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        try {

            // ==================================================
            // 🎫 CRIAR TICKET
            // ==================================================
            if (interaction.isButton()) {
                if (
                    interaction.customId === 'abrir_ticket_suporte' ||
                    interaction.customId === 'abrir_ticket_parceria'
                ) {
                    const ticketType =
                        interaction.customId === 'abrir_ticket_suporte'
                            ? 'suporte'
                            : 'parceria';

                    const existingChannel = interaction.guild.channels.cache.find(c =>
                        c.name.includes(interaction.user.username.toLowerCase())
                    );

                    if (existingChannel) {
                        return replyTemp(interaction, {
                            content: `❌ Você já possui um ticket aberto: ${existingChannel}`
                        });
                    }

                    const channel = await interaction.guild.channels.create({
                        name: `ticket-${ticketType}-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        parent: TICKET_CATEGORY_ID,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionsBitField.Flags.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages
                                ]
                            }
                        ]
                    });

                    // BOTÕES DO TICKET
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('assumir_ticket')
                            .setLabel('Assumir Ticket')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('fechar_ticket')
                            .setLabel('Fechar Ticket')
                            .setStyle(ButtonStyle.Danger)
                    );

                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🎫 Ticket aberto com sucesso')
                        .setDescription(
                            `Olá ${interaction.user}, seu ticket foi criado.\n\n` +
                            `Aguarde um membro da equipe assumir o atendimento.`
                        )
                        .setFooter({ text: interaction.guild.name })
                        .setTimestamp();

                    await channel.send({
                        content: `${interaction.user}`,
                        embeds: [embed],
                        components: [row]
                    });

                    return replyTemp(interaction, {
                        content: `✅ Ticket criado: ${channel}`
                    });
                }
            }

            // ==================================================
            // 👨‍💼 ASSUMIR TICKET
            // ==================================================
            if (interaction.isButton() && interaction.customId === 'assumir_ticket') {
                if (!memberHasStaffRole(interaction.member)) {
                    return replyTemp(interaction, {
                        content: '❌ Apenas a equipe pode assumir tickets.'
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🟢 Atendimento iniciado')
                    .setDescription(
                        `Olá! 👋\n\n` +
                        `O membro da equipe ${interaction.user} está pronto para te atender.\n\n` +
                        `Fique à vontade para explicar sua situação com detalhes, estamos aqui para ajudar você da melhor forma possível.`
                    )
                    .setFooter({
                        text: 'Atendimento profissional • Equipe do servidor'
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ==================================================
            // 🔒 FECHAR TICKET
            // ==================================================
            if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
                if (!memberHasStaffRole(interaction.member)) {
                    return replyTemp(interaction, {
                        content: '❌ Apenas a equipe pode fechar tickets.'
                    });
                }

                await interaction.reply({
                    content: '🔒 Ticket será fechado em 5 segundos...'
                });

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 5000);
            }

            // ==================================================
            // POSTS (LIKE)
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_like:')) {
                const id = interaction.customId.split(':')[1];
                const result = toggleLike(id, interaction.user);

                await refreshPostButtons(interaction.message);

                return replyTemp(interaction, {
                    content: result.liked
                        ? `💚 Curtida adicionada`
                        : `💔 Curtida removida`
                });
            }

            // ==================================================
            // COMENTAR
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_comment:')) {
                const id = interaction.customId.split(':')[1];

                const modal = new ModalBuilder()
                    .setCustomId(`post_comment_modal:${id}`)
                    .setTitle('Comentário');

                const input = new TextInputBuilder()
                    .setCustomId('post_comment_text')
                    .setLabel('Digite seu comentário')
                    .setStyle(TextInputStyle.Paragraph);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                return interaction.showModal(modal);
            }

            // ==================================================
            // MODAL COMENTÁRIO
            // ==================================================
            if (interaction.isModalSubmit() && interaction.customId.startsWith('post_comment_modal:')) {
                const id = interaction.customId.split(':')[1];

                const result = addComment(
                    id,
                    interaction.user,
                    interaction.fields.getTextInputValue('post_comment_text')
                );

                return replyTemp(interaction, {
                    content: `💬 Comentário enviado`
                });
            }

            // ==================================================
            // VER COMENTÁRIOS
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_view_comments:')) {
                const id = interaction.customId.split(':')[1];

                return replyTemp(interaction, {
                    embeds: [buildCommentsEmbed(id)]
                });
            }

        } catch (error) {
            console.error(error);

            return replyTemp(interaction, {
                content: '❌ Erro ao processar interação.'
            });
        }
    }
};
