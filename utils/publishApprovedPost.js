const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { initPostRecord } = require('./postInteractions');

function truncate(text, maxLength) {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
}

function buildPostButtons(messageId, likesCount = 0, commentsCount = 0) {
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

async function publishApprovedPost({
    channel,
    title,
    mediaUrl,
    mediaType,
    author
}) {
    const authorName = author?.username || 'usuário';
    const authorMention = author?.id ? `<@${author.id}>` : `@${authorName}`;
    const safeTitle = truncate(title || 'Sem título', 256);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`✦ ${safeTitle}`)
        .setAuthor({
            name: `@${authorName}`,
            iconURL: author?.displayAvatarURL?.({ dynamic: true }) || null
        })
        .setDescription(`Post de ${authorMention}`)
        .setFooter({
            text: `Post enviado por ${authorName}`
        })
        .setTimestamp();

    if (mediaUrl && mediaType?.startsWith('image/')) {
        embed.setImage(mediaUrl);
    }

    if (mediaUrl && mediaType?.startsWith('video/')) {
        embed.addFields({
            name: '🎬 Mídia',
            value: `[Clique aqui para assistir ao vídeo](${mediaUrl})`,
            inline: false
        });
    }

    const sentMessage = await channel.send({
        embeds: [embed],
        components: [buildPostButtons('temp')]
    });

    initPostRecord(sentMessage, author?.id || null);

    await sentMessage.edit({
        components: [buildPostButtons(sentMessage.id, 0, 0)]
    });

    return sentMessage;
}

module.exports = {
    publishApprovedPost
};
