const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');
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
            console.error('Erro no sistema de interações das postagens:', error);

            if (interaction.deferred || interaction.replied) {
                return;
            }

            return interaction.reply({
                content: '❌ Ocorreu um erro ao processar a interação da postagem.',
                ephemeral: true
            });
        }
    }
};