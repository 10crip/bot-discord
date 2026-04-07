const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
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

// ==================================================
// 🧠 FUNÇÃO GLOBAL PRA RESPOSTA EPHEMERAL AUTO-DELETE
// ==================================================
async function replyTemp(interaction, payload) {
    const data = { ...payload, ephemeral: true };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(data).catch(() => {});
    } else {
        await interaction.reply(data).catch(() => {});
    }

    // ⏳ apagar depois de 25s
    setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
    }, 25000);
}

module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        try {
            // ==================================================
            // 🎫 TICKETS
            // ==================================================
            if (interaction.isButton()) {
                if (
                    interaction.customId === 'abrir_ticket_suporte' ||
                    interaction.customId === 'abrir_ticket_parceria'
                ) {
                    if (!interaction.guild) {
                        return replyTemp(interaction, {
                            content: '❌ Esta interação só pode ser usada em servidor.'
                        });
                    }

                    const ticketType =
                        interaction.customId === 'abrir_ticket_suporte'
                            ? 'suporte'
                            : 'parceria';

                    const category = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);

                    if (!category || category.type !== ChannelType.GuildCategory) {
                        return replyTemp(interaction, {
                            content: '❌ Categoria de tickets não encontrada.'
                        });
                    }

                    const existingChannel = interaction.guild.channels.cache.find(channel => {
                        if (channel.type !== ChannelType.GuildText) return false;
                        if (channel.parentId !== TICKET_CATEGORY_ID) return false;

                        const hasUserPermission = channel.permissionOverwrites.cache.some(
                            overwrite =>
                                overwrite.id === interaction.user.id &&
                                overwrite.allow.has(PermissionsBitField.Flags.ViewChannel)
                        );

                        return hasUserPermission && channel.name.startsWith(`ticket-${ticketType}-`);
                    });

                    if (existingChannel) {
                        return replyTemp(interaction, {
                            content: `❌ Você já possui um ticket aberto: ${existingChannel}`
                        });
                    }

                    const safeUserName = interaction.user.username
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .slice(0, 10);

                    const channel = await interaction.guild.channels.create({
                        name: `ticket-${ticketType}-${safeUserName}`,
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
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory
                                ]
                            }
                        ]
                    });

                    await channel.send({
                        content: `👋 ${interaction.user}, descreva seu problema.`
                    });

                    return replyTemp(interaction, {
                        content: `✅ Seu ticket foi criado com sucesso em ${channel}`
                    });
                }
            }

            // ==================================================
            // ❤️ POSTS (LIKE)
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_like:')) {
                const messageId = interaction.customId.split(':')[1];
                const post = getPostRecord(messageId);

                if (!post) {
                    return replyTemp(interaction, {
                        content: '❌ Post não encontrado.'
                    });
                }

                const result = toggleLike(messageId, interaction.user);
                await refreshPostButtons(interaction.message);

                return replyTemp(interaction, {
                    content: result.liked
                        ? `💚 Curtida adicionada (${result.likesCount})`
                        : `💔 Curtida removida (${result.likesCount})`
                });
            }

            // ==================================================
            // 💬 COMENTAR
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_comment:')) {
                const messageId = interaction.customId.split(':')[1];

                const modal = new ModalBuilder()
                    .setCustomId(`post_comment_modal:${messageId}`)
                    .setTitle('Comentar');

                const input = new TextInputBuilder()
                    .setCustomId('post_comment_text')
                    .setLabel('Comentário')
                    .setStyle(TextInputStyle.Paragraph);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                return interaction.showModal(modal);
            }

            // ==================================================
            // 📥 MODAL COMENTÁRIO
            // ==================================================
            if (interaction.isModalSubmit() && interaction.customId.startsWith('post_comment_modal:')) {
                const messageId = interaction.customId.split(':')[1];

                const result = addComment(
                    messageId,
                    interaction.user,
                    interaction.fields.getTextInputValue('post_comment_text')
                );

                return replyTemp(interaction, {
                    content: `💬 Comentário enviado (${result.commentsCount})`
                });
            }

            // ==================================================
            // 👀 VER COMENTÁRIOS
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('post_view_comments:')) {
                const messageId = interaction.customId.split(':')[1];

                return replyTemp(interaction, {
                    embeds: [buildCommentsEmbed(messageId)]
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
