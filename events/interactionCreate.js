const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
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

module.exports = {
    name: 'interactionCreate',

    async execute(client, interaction) {
        try {
            // ==================================================
            // APROVAÇÃO / RECUSA DE POSTS
            // ==================================================
            if (interaction.isButton()) {
                if (
                    interaction.customId.startsWith('approve_post:') ||
                    interaction.customId.startsWith('reject_post:')
                ) {
                    if (!interaction.guild) {
                        return interaction.reply({
                            content: '❌ Esta interação só pode ser usada em servidor.',
                            ephemeral: true
                        });
                    }

                    if (!memberHasStaffRole(interaction.member)) {
                        return interaction.reply({
                            content: '❌ Você não tem permissão para gerenciar postagens.',
                            ephemeral: true
                        });
                    }

                    const [action, postId] = interaction.customId.split(':');
                    const publishChannelId = process.env.POST_CHANNEL_ID;

                    if (!publishChannelId) {
                        return interaction.reply({
                            content: '❌ O canal final de postagens não está configurado no .env.',
                            ephemeral: true
                        });
                    }

                    if (action === 'approve_post') {
                        const post = await approvePost(interaction, postId, publishChannelId);

                        const embed = new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('✅ Postagem aprovada')
                            .setDescription(`A postagem **${post.title || 'Sem título'}** foi aprovada e publicada.`)
                            .setFooter({ text: `Aprovada por ${interaction.user.username}` })
                            .setTimestamp();

                        return interaction.update({
                            embeds: [embed],
                            components: []
                        });
                    }

                    if (action === 'reject_post') {
                        const post = await rejectPost(interaction, postId);

                        const embed = new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('❌ Postagem recusada')
                            .setDescription(`A postagem **${post.title || 'Sem título'}** foi recusada.`)
                            .setFooter({ text: `Recusada por ${interaction.user.username}` })
                            .setTimestamp();

                        return interaction.update({
                            embeds: [embed],
                            components: []
                        });
                    }
                }
            }

            // ==================================================
            // INTERAÇÕES DOS POSTS PUBLICADOS
            // ==================================================
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('post_like:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return interaction.reply({
                            content: '❌ Esta postagem não está registrada no sistema.',
                            ephemeral: true
                        });
                    }

                    const result = toggleLike(messageId, interaction.user);

                    await refreshPostButtons(interaction.message);

                    const embed = new EmbedBuilder()
                        .setColor(result.liked ? '#57F287' : '#FEE75C')
                        .setTitle(result.liked ? '💚 Curtida adicionada' : '💔 Curtida removida')
                        .setDescription(
                            result.liked
                                ? 'Sua curtida foi adicionada com sucesso.'
                                : 'Sua curtida foi removida com sucesso.'
                        )
                        .addFields({
                            name: 'Total de curtidas',
                            value: String(result.likesCount),
                            inline: true
                        })
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith('post_comment:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return interaction.reply({
                            content: '❌ Esta postagem não está registrada no sistema.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`post_comment_modal:${messageId}`)
                        .setTitle('💬 Comentar na postagem');

                    const commentInput = new TextInputBuilder()
                        .setCustomId('post_comment_text')
                        .setLabel('Escreva seu comentário')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Digite aqui o seu comentário...')
                        .setRequired(true)
                        .setMaxLength(1000);

                    const row = new ActionRowBuilder().addComponents(commentInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('post_view_comments:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return interaction.reply({
                            content: '❌ Esta postagem não está registrada no sistema.',
                            ephemeral: true
                        });
                    }

                    const embed = buildCommentsEmbed(messageId);

                    return interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('post_comment_modal:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return interaction.reply({
                            content: '❌ Esta postagem não está registrada no sistema.',
                            ephemeral: true
                        });
                    }

                    const commentText = interaction.fields.getTextInputValue('post_comment_text');
                    const result = addComment(messageId, interaction.user, commentText);

                    const channel = await interaction.client.channels.fetch(post.channelId).catch(() => null);

                    if (channel) {
                        const targetMessage = await channel.messages.fetch(messageId).catch(() => null);

                        if (targetMessage) {
                            await refreshPostButtons(targetMessage);
                        }
                    }

                    if (post.authorId && post.authorId !== interaction.user.id) {
                        const authorUser = await interaction.client.users.fetch(post.authorId).catch(() => null);

                        if (authorUser) {
                            const notificationEmbed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle('🔔 Novo comentário na sua postagem')
                                .setDescription(`**${interaction.user.username}** comentou na sua postagem.`)
                                .addFields(
                                    {
                                        name: 'Comentário',
                                        value: result.comment.content.length > 1024
                                            ? `${result.comment.content.slice(0, 1021)}...`
                                            : result.comment.content,
                                        inline: false
                                    },
                                    {
                                        name: 'Total de comentários',
                                        value: String(result.commentsCount),
                                        inline: true
                                    }
                                )
                                .setTimestamp();

                            await authorUser.send({ embeds: [notificationEmbed] }).catch(() => null);
                        }
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('✅ Comentário enviado')
                        .setDescription('Seu comentário foi adicionado com sucesso.')
                        .addFields({
                            name: 'Total de comentários',
                            value: String(result.commentsCount),
                            inline: true
                        })
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }
            }

            // ==================================================
            // BLOCO RESERVADO PARA O SISTEMA !MENSAGEM
            // ==================================================
            // Aqui entra o tratamento dos customIds do editor:
            // mensagem_select_template
            // mensagem_edit_titulo
            // mensagem_edit_subtitulo
            // mensagem_edit_texto
            // mensagem_edit_cor
            // mensagem_edit_footer
            // mensagem_edit_highlight
            // mensagem_edit_cta
            // mensagem_edit_imagem
            // mensagem_edit_thumb
            // mensagem_edit_icone
            // mensagem_publicar
            // mensagem_cancelar
            //
            // Como o conteúdo do arquivo events/mensagemBuilder.js não veio,
            // mantive essa área separada para você encaixar a lógica exata sem
            // misturar com posts/aprovação e sem quebrar o restante.

        } catch (error) {
            console.error('Erro no interactionCreate:', error);

            if (interaction.replied || interaction.deferred) return;

            return interaction.reply({
                content: '❌ Ocorreu um erro ao processar esta interação.',
                ephemeral: true
            });
        }
    }
};
