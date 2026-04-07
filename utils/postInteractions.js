const fs = require('fs');
const path = require('path');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'postInteractions.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readData() {
    ensureFile();

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Erro ao ler postInteractions.json:', error);
        return {};
    }
}

function saveData(data) {
    ensureFile();

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar postInteractions.json:', error);
    }
}

function createDefaultPostRecord(messageId, channelId, guildId) {
    return {
        messageId,
        channelId,
        guildId,
        likes: [],
        comments: [],
        createdAt: Date.now()
    };
}

function ensurePostRecord(messageId, channelId = null, guildId = null) {
    const data = readData();

    if (!data[messageId]) {
        data[messageId] = createDefaultPostRecord(messageId, channelId, guildId);
        saveData(data);
    }

    return data[messageId];
}

function getPostRecord(messageId) {
    const data = readData();
    return data[messageId] || null;
}

function initPostRecord(message) {
    const data = readData();

    if (!data[message.id]) {
        data[message.id] = createDefaultPostRecord(
            message.id,
            message.channel.id,
            message.guild?.id || null
        );
        saveData(data);
    }

    return data[message.id];
}

function toggleLike(messageId, user) {
    const data = readData();
    const post = data[messageId];

    if (!post) return null;

    const alreadyLiked = post.likes.includes(user.id);

    if (alreadyLiked) {
        post.likes = post.likes.filter(id => id !== user.id);
    } else {
        post.likes.push(user.id);
    }

    saveData(data);

    return {
        liked: !alreadyLiked,
        likesCount: post.likes.length
    };
}

function addComment(messageId, user, content) {
    const data = readData();
    const post = data[messageId];

    if (!post) return null;

    const cleanContent = String(content || '').trim();

    if (!cleanContent.length) return null;

    post.comments.push({
        userId: user.id,
        username: user.username,
        globalName: user.globalName || null,
        content: cleanContent.slice(0, 1000),
        createdAt: Date.now()
    });

    saveData(data);

    return {
        commentsCount: post.comments.length,
        comment: post.comments[post.comments.length - 1]
    };
}

function getComments(messageId) {
    const post = getPostRecord(messageId);
    return post ? post.comments || [] : [];
}

function getLikesCount(messageId) {
    const post = getPostRecord(messageId);
    return post ? (post.likes?.length || 0) : 0;
}

function getCommentsCount(messageId) {
    const post = getPostRecord(messageId);
    return post ? (post.comments?.length || 0) : 0;
}

function buildPostActionRow(messageId) {
    const likesCount = getLikesCount(messageId);
    const commentsCount = getCommentsCount(messageId);

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`post_like:${messageId}`)
            .setLabel(`Curtir (${likesCount})`)
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`post_comment:${messageId}`)
            .setLabel(`Comentar (${commentsCount})`)
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`post_view_comments:${messageId}`)
            .setLabel('Ver comentários')
            .setStyle(ButtonStyle.Secondary)
    );
}

function buildCommentsEmbed(messageId) {
    const post = getPostRecord(messageId);

    if (!post) {
        return new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Comentários não encontrados')
            .setDescription('Não foi possível localizar esta postagem no banco de dados.')
            .setTimestamp();
    }

    const comments = post.comments || [];

    if (!comments.length) {
        return new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💬 Comentários da postagem')
            .setDescription('Esta postagem ainda não possui comentários.')
            .addFields(
                { name: '👍 Curtidas', value: String(post.likes?.length || 0), inline: true },
                { name: '💬 Comentários', value: '0', inline: true }
            )
            .setTimestamp();
    }

    const latestComments = comments.slice(-10).reverse();

    const description = latestComments
        .map((comment, index) => {
            const displayName = comment.globalName || comment.username || 'Usuário';
            const timestamp = Math.floor(comment.createdAt / 1000);

            return [
                `**${index + 1}. ${displayName}**`,
                `${comment.content}`,
                `<t:${timestamp}:R>`
            ].join('\n');
        })
        .join('\n\n');

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💬 Comentários da postagem')
        .setDescription(description)
        .addFields(
            { name: '👍 Curtidas', value: String(post.likes?.length || 0), inline: true },
            { name: '💬 Total de comentários', value: String(comments.length), inline: true }
        )
        .setFooter({ text: comments.length > 10 ? 'Mostrando os 10 comentários mais recentes.' : 'Lista completa de comentários.' })
        .setTimestamp();
}

async function refreshPostButtons(message) {
    await message.edit({
        components: [buildPostActionRow(message.id)]
    });
}

module.exports = {
    ensurePostRecord,
    getPostRecord,
    initPostRecord,
    toggleLike,
    addComment,
    getComments,
    getLikesCount,
    getCommentsCount,
    buildPostActionRow,
    buildCommentsEmbed,
    refreshPostButtons
};