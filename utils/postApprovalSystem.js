const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getPostApprovalChannel } = require('../guildConfig');
const { publishApprovedPost } = require('./publishApprovedPost');

const DEFAULT_APPROVAL_CHANNEL_ID = '1490959069811445821';

const dataDir = path.join(__dirname, '..', 'data');
const pendingPostsFile = path.join(dataDir, 'pending_posts.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(pendingPostsFile)) {
        fs.writeFileSync(pendingPostsFile, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readPendingPosts() {
    ensureFile();

    try {
        const raw = fs.readFileSync(pendingPostsFile, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Erro ao ler pending_posts.json:', error);
        return {};
    }
}

function savePendingPosts(data) {
    ensureFile();

    try {
        fs.writeFileSync(pendingPostsFile, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar pending_posts.json:', error);
    }
}

function generatePostId() {
    return `post_${Date.now()}_${Math.floor(Math.random() * 999999)}`;
}

async function sendPostToApproval({
    client,
    guild,
    author,
    title,
    mediaUrl,
    mediaType
}) {
    const configuredApprovalChannelId = guild?.id ? getPostApprovalChannel(guild.id) : null;
    const approvalChannelId = configuredApprovalChannelId || DEFAULT_APPROVAL_CHANNEL_ID;

    if (!approvalChannelId) {
        throw new Error('Canal de aprovação não configurado neste servidor.');
    }

    const approvalChannel = await client.channels.fetch(approvalChannelId).catch(() => null);

    if (!approvalChannel) {
        throw new Error('Canal de aprovação não encontrado.');
    }

    const postId = generatePostId();
    const pendingPosts = readPendingPosts();

    pendingPosts[postId] = {
        postId,
        guildId: guild.id,
        userId: author.id,
        title,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        status: 'pending',
        createdAt: Date.now()
    };

    savePendingPosts(pendingPosts);

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('📝 Nova postagem para aprovação')
        .addFields(
            { name: 'Autor', value: `<@${author.id}>`, inline: true },
            { name: 'ID da postagem', value: postId, inline: true },
            { name: 'Título', value: title || 'Sem título', inline: false },
            {
                name: 'Tipo',
                value: mediaType?.startsWith('image/')
                    ? 'Imagem'
                    : mediaType?.startsWith('video/')
                        ? 'Vídeo'
                        : 'Arquivo',
                inline: true
            }
        )
        .setFooter({ text: `Post ID: ${postId}` })
        .setTimestamp();

    if (mediaUrl && mediaType?.startsWith('image/')) {
        embed.setImage(mediaUrl);
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_post:${postId}`)
            .setLabel('Aprovar')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`reject_post:${postId}`)
            .setLabel('Recusar')
            .setStyle(ButtonStyle.Danger)
    );

    const payload = {
        embeds: [embed],
        components: [row]
    };

    if (mediaUrl && mediaType?.startsWith('video/')) {
        payload.content = `🎬 **Vídeo enviado:** ${mediaUrl}`;
    }

    await approvalChannel.send(payload);

    return postId;
}

async function approvePost(interaction, postId, publishChannelId) {
    const pendingPosts = readPendingPosts();
    const post = pendingPosts[postId];

    if (!post) {
        throw new Error('Postagem pendente não encontrada.');
    }

    if (post.status !== 'pending') {
        throw new Error('Esta postagem já foi processada.');
    }

    const publishChannel = await interaction.client.channels.fetch(publishChannelId).catch(() => null);

    if (!publishChannel) {
        throw new Error('Canal de publicação não encontrado.');
    }

    const author = await interaction.client.users.fetch(post.userId).catch(() => null);

    await publishApprovedPost({
        channel: publishChannel,
        title: post.title,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        author
    });

    post.status = 'approved';
    post.approvedBy = interaction.user.id;
    post.approvedAt = Date.now();

    savePendingPosts(pendingPosts);

    if (author) {
        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Sua postagem foi aprovada')
            .setDescription('Sua postagem foi aprovada e publicada com sucesso.')
            .addFields(
                { name: 'Título', value: post.title || 'Sem título', inline: false }
            )
            .setTimestamp();

        await author.send({ embeds: [embed] }).catch(() => null);
    }

    return post;
}

async function rejectPost(interaction, postId) {
    const pendingPosts = readPendingPosts();
    const post = pendingPosts[postId];

    if (!post) {
        throw new Error('Postagem pendente não encontrada.');
    }

    if (post.status !== 'pending') {
        throw new Error('Esta postagem já foi processada.');
    }

    post.status = 'rejected';
    post.rejectedBy = interaction.user.id;
    post.rejectedAt = Date.now();

    savePendingPosts(pendingPosts);

    const author = await interaction.client.users.fetch(post.userId).catch(() => null);

    if (author) {
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Sua postagem foi recusada')
            .setDescription('Sua postagem foi analisada e não foi aprovada.')
            .addFields(
                { name: 'Título', value: post.title || 'Sem título', inline: false }
            )
            .setTimestamp();

        await author.send({ embeds: [embed] }).catch(() => null);
    }

    return post;
}

module.exports = {
    sendPostToApproval,
    approvePost,
    rejectPost
};
