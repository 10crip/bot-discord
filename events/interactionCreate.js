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
                        return interaction.reply({
                            content: '❌ Esta interação só pode ser usada em servidor.',
                            ephemeral: true
                        });
                    }

                    const ticketType =
                        interaction.customId === 'abrir_ticket_suporte'
                            ? 'suporte'
                            : 'parceria';

                    const existingChannel = interaction.guild.channels.cache.find(channel => {
                        if (channel.type !== ChannelType.GuildText) return false;

                        const hasUserPermission = channel.permissionOverwrites.cache.some(
                            overwrite =>
                                overwrite.id === interaction.user.id &&
                                overwrite.allow.has(PermissionsBitField.Flags.ViewChannel)
                        );

                        return hasUserPermission && channel.name.startsWith(`ticket-${ticketType}-`);
                    });

                    if (existingChannel) {
                        return interaction.reply({
                            content: `❌ Você já possui um ticket de **${ticketType}** aberto em ${existingChannel}.`,
                            ephemeral: true
                        });
                    }

                    const safeUserName = interaction.user.username
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9-_]/g, '')
                        .slice(0, 12) || 'usuario';

                    const channelName = `ticket-${ticketType}-${safeUserName}`;

                    const channel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
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
                                    PermissionsBitField.Flags.ReadMessageHistory,
                                    PermissionsBitField.Flags.AttachFiles,
                                    PermissionsBitField.Flags.EmbedLinks
                                ]
                            }
                        ]
                    });

                    const embed = new EmbedBuilder()
                        .setColor(ticketType === 'suporte' ? '#5865F2' : '#57F287')
                        .setTitle(
                            ticketType === 'suporte'
                                ? '🛠️ Ticket de Suporte Aberto'
                                : '🤝 Ticket de Parceria Aberto'
                        )
                        .setDescription(
                            `Olá ${interaction.user}, seu atendimento de **${ticketType}** foi criado com sucesso.\n\n` +
                            'Descreva os detalhes da sua solicitação e aguarde a equipe responder.'
                        )
                        .addFields({
                            name: '📌 Importante',
                            value: 'Explique seu caso com clareza para agilizar o atendimento.',
                            inline: false
                        })
                        .setFooter({
                            text: `${interaction.guild.name} • Sistema de tickets`
                        })
                        .setTimestamp();

                    await channel.send({
                        content: `${interaction.user}`,
                        embeds: [embed]
                    });

                    return interaction.reply({
                        content: `✅ Seu ticket foi criado com sucesso: ${channel}`,
                        ephemeral: true
                    });
                }
            }

            // ==================================================
            // ✅ APROVAÇÃO / ❌ RECUSA DE POSTS
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
            // ❤️ INTERAÇÕES DAS POSTAGENS
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

                    if (!result) {
                        return interaction.reply({
                            content: '❌ Não foi possível adicionar o comentário.',
                            ephemeral: true
                        });
                    }

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
