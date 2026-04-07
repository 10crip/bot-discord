const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');
const {
    getGuildConfig
} = require('../utils/guildConfig');
const {
    isStaff
} = require('../utils/staff');
const {
    createPendingPost,
    getPendingPostById,
    updatePendingPost
} = require('../utils/pendingPosts');

function isImage(attachment) {
    if (!attachment?.contentType && !attachment?.name) return false;

    const contentType = attachment.contentType || '';
    const name = attachment.name || '';

    return contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
}

function isVideo(attachment) {
    if (!attachment?.contentType && !attachment?.name) return false;

    const contentType = attachment.contentType || '';
    const name = attachment.name || '';

    return contentType.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(name);
}

function buildApprovalEmbed(client, guild, post) {
    const author = client.users.cache.get(post.authorId);

    const embed = new EmbedBuilder()
        .setTitle('📨 Nova postagem para aprovação')
        .setColor('#FEE75C')
        .addFields(
            { name: 'Autor', value: author ? `${author.tag} (${author.id})` : `<@${post.authorId}>`, inline: false },
            { name: 'Título', value: post.title || 'Sem título', inline: false },
            { name: 'Tipo de mídia', value: post.mediaType || 'desconhecido', inline: true },
            { name: 'Post ID', value: post.id, inline: true }
        )
        .setFooter({ text: `Servidor: ${guild.name}` })
        .setTimestamp(new Date(post.createdAt));

    if (post.mediaType === 'image' && post.attachmentUrl) {
        embed.setImage(post.attachmentUrl);
    } else if (post.attachmentUrl) {
        embed.addFields({
            name: 'Arquivo',
            value: `[Clique para visualizar](${post.attachmentUrl})`,
            inline: false
        });
    }

    return embed;
}

function buildPublicPostEmbed(client, post) {
    const author = client.users.cache.get(post.authorId);

    const embed = new EmbedBuilder()
        .setTitle(post.title || 'Nova postagem')
        .setColor('#5865F2')
        .setFooter({
            text: author ? `Postado por ${author.tag}` : `Postado por ${post.authorId}`
        })
        .setTimestamp(new Date());

    if (post.mediaType === 'image' && post.attachmentUrl) {
        embed.setImage(post.attachmentUrl);
    } else if (post.mediaType === 'video' && post.attachmentUrl) {
        embed.setDescription(`🎬 **Vídeo enviado**\n[Assistir/Vizualizar vídeo](${post.attachmentUrl})`);
    } else if (post.attachmentUrl) {
        embed.setDescription(`[Abrir arquivo](${post.attachmentUrl})`);
    }

    return embed;
}

async function askQuestion(channel, userId, question, time = 120000) {
    await channel.send(question);

    const collected = await channel.awaitMessages({
        filter: (msg) => msg.author.id === userId,
        max: 1,
        time,
        errors: ['time']
    });

    return collected.first();
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            if (interaction.isButton()) {
                if (interaction.customId === 'posting_iniciar') {
                    if (!interaction.guild) {
                        return interaction.reply({
                            content: '❌ Este botão só funciona dentro de um servidor.',
                            ephemeral: true
                        });
                    }

                    const user = interaction.user;

                    await interaction.reply({
                        content: '📩 Verifique sua DM para continuar a postagem.',
                        ephemeral: true
                    });

                    let dmChannel;
                    try {
                        dmChannel = await user.createDM();
                    } catch {
                        return interaction.followUp({
                            content: '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.',
                            ephemeral: true
                        });
                    }

                    const intro = new EmbedBuilder()
                        .setTitle('📝 Criar postagem')
                        .setColor('#5865F2')
                        .setDescription(
                            [
                                'Vamos montar sua postagem.',
                                '',
                                '**Etapa 1:** envie o título',
                                '**Etapa 2:** envie a imagem ou vídeo'
                            ].join('\n')
                        );

                    await dmChannel.send({ embeds: [intro] });

                    let titleMessage;
                    try {
                        titleMessage = await askQuestion(
                            dmChannel,
                            user.id,
                            '📌 Envie agora o **título** da postagem.'
                        );
                    } catch {
                        return dmChannel.send('⏰ Tempo esgotado. Inicie novamente pelo painel.');
                    }

                    const title = titleMessage.content?.trim();
                    if (!title) {
                        return dmChannel.send('❌ Título inválido. Inicie novamente pelo painel.');
                    }

                    let mediaMessage;
                    try {
                        mediaMessage = await askQuestion(
                            dmChannel,
                            user.id,
                            '🖼️ Agora envie a **imagem ou vídeo** da postagem.'
                        );
                    } catch {
                        return dmChannel.send('⏰ Tempo esgotado. Inicie novamente pelo painel.');
                    }

                    const attachment = mediaMessage.attachments.first();
                    if (!attachment) {
                        return dmChannel.send('❌ Você precisa enviar uma imagem ou vídeo. Inicie novamente pelo painel.');
                    }

                    let mediaType = 'file';
                    if (isImage(attachment)) mediaType = 'image';
                    if (isVideo(attachment)) mediaType = 'video';

                    if (!['image', 'video'].includes(mediaType)) {
                        return dmChannel.send('❌ Apenas imagens e vídeos são aceitos.');
                    }

                    const pendingPost = createPendingPost({
                        guildId: interaction.guild.id,
                        authorId: user.id,
                        title,
                        mediaType,
                        attachmentUrl: attachment.url,
                        attachmentName: attachment.name || 'arquivo',
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        approvalChannelId: null,
                        approvalMessageId: null
                    });

                    const guildConfig = getGuildConfig(interaction.guild.id);

                    await dmChannel.send('✅ Sua postagem foi recebida e entrou na fila de aprovação.');

                    if (!guildConfig.approvalChannelId) {
                        return dmChannel.send(
                            '⚠️ Ainda não existe um canal de aprovação configurado neste servidor.\nPeça para um staff usar `!verificarpost` no canal desejado.'
                        );
                    }

                    const approvalChannel = interaction.guild.channels.cache.get(guildConfig.approvalChannelId);
                    if (!approvalChannel) {
                        return dmChannel.send(
                            '⚠️ O canal de aprovação configurado não foi encontrado. Peça para a staff usar `!verificarpost` novamente.'
                        );
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`post_approve_${pendingPost.id}`)
                            .setLabel('Aprovar')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`post_reject_${pendingPost.id}`)
                            .setLabel('Recusar')
                            .setStyle(ButtonStyle.Danger)
                    );

                    const approvalEmbed = buildApprovalEmbed(interaction.client, interaction.guild, pendingPost);

                    const files = [];
                    if (pendingPost.mediaType === 'video') {
                        files.push(pendingPost.attachmentUrl);
                    }

                    const sentApprovalMessage = await approvalChannel.send({
                        embeds: [approvalEmbed],
                        components: [row],
                        files
                    });

                    updatePendingPost(pendingPost.id, {
                        approvalChannelId: approvalChannel.id,
                        approvalMessageId: sentApprovalMessage.id
                    });

                    return;
                }

                if (interaction.customId.startsWith('post_approve_') || interaction.customId.startsWith('post_reject_')) {
                    if (!interaction.guild) {
                        return interaction.reply({
                            content: '❌ Esta ação só funciona dentro de um servidor.',
                            ephemeral: true
                        });
                    }

                    if (!isStaff(interaction.member, interaction.guild.id)) {
                        return interaction.reply({
                            content: '❌ Você não tem permissão para aprovar ou recusar postagens.',
                            ephemeral: true
                        });
                    }

                    const isApprove = interaction.customId.startsWith('post_approve_');
                    const postId = interaction.customId.split('_').slice(2).join('_');
                    const post = getPendingPostById(postId);

                    if (!post || post.guildId !== interaction.guild.id) {
                        return interaction.reply({
                            content: '❌ Esta postagem não foi encontrada.',
                            ephemeral: true
                        });
                    }

                    if (post.status !== 'pending') {
                        return interaction.reply({
                            content: '⚠️ Esta postagem já foi processada.',
                            ephemeral: true
                        });
                    }

                    const author = await interaction.client.users.fetch(post.authorId).catch(() => null);

                    if (isApprove) {
                        let targetChannel = null;

                        if (process.env.POST_CHANNEL_ID) {
                            targetChannel = interaction.guild.channels.cache.get(process.env.POST_CHANNEL_ID) || null;
                        }

                        if (!targetChannel) {
                            targetChannel = interaction.channel;
                        }

                        const publicEmbed = buildPublicPostEmbed(interaction.client, post);

                        const sendOptions = {
                            embeds: [publicEmbed]
                        };

                        if (post.mediaType === 'video' && post.attachmentUrl) {
                            sendOptions.files = [post.attachmentUrl];
                        }

                        await targetChannel.send(sendOptions);

                        updatePendingPost(post.id, {
                            status: 'approved',
                            approvedBy: interaction.user.id,
                            approvedAt: new Date().toISOString()
                        });

                        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                            .setColor('#57F287')
                            .addFields({
                                name: 'Status',
                                value: `✅ Aprovado por ${interaction.user}`,
                                inline: false
                            });

                        await interaction.update({
                            embeds: [updatedEmbed],
                            components: []
                        });

                        if (author) {
                            await author.send(`✅ Sua postagem **"${post.title}"** foi aprovada e publicada.`).catch(() => null);
                        }

                        return;
                    }

                    updatePendingPost(post.id, {
                        status: 'rejected',
                        rejectedBy: interaction.user.id,
                        rejectedAt: new Date().toISOString()
                    });

                    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor('#ED4245')
                        .addFields({
                            name: 'Status',
                            value: `❌ Recusado por ${interaction.user}`,
                            inline: false
                        });

                    await interaction.update({
                        embeds: [updatedEmbed],
                        components: []
                    });

                    if (author) {
                        await author.send(`❌ Sua postagem **"${post.title}"** foi recusada pela equipe.`).catch(() => null);
                    }

                    return;
                }
            }
        } catch (error) {
            console.error('[POST SYSTEM ERROR]', error);

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({
                    content: '❌ Ocorreu um erro ao processar essa ação.',
                    ephemeral: true
                }).catch(() => null);
            }

            return interaction.reply({
                content: '❌ Ocorreu um erro ao processar essa ação.',
                ephemeral: true
            }).catch(() => null);
        }
    }
};