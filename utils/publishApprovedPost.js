const { EmbedBuilder } = require('discord.js');
const {
    initPostRecord,
    buildPostActionRow
} = require('./postInteractions');

async function publishApprovedPost({
    channel,
    title,
    mediaUrl = null,
    mediaType = null,
    author = null
}) {
    if (!channel) {
        throw new Error('Canal de postagem não informado.');
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title || 'Nova postagem')
        .setTimestamp();

    if (author) {
        embed.setFooter({
            text: `Post enviado por ${author.username}`,
            iconURL: author.displayAvatarURL({ dynamic: true })
        });
    }

    const payload = {
        embeds: [embed]
    };

    if (mediaUrl) {
        if (mediaType && mediaType.startsWith('image/')) {
            embed.setImage(mediaUrl);
        } else if (mediaType && mediaType.startsWith('video/')) {
            payload.content = `🎬 **Vídeo da postagem:** ${mediaUrl}`;
            payload.files = [mediaUrl];
        } else {
            payload.content = `📎 **Mídia da postagem:** ${mediaUrl}`;
        }
    }

    const sentMessage = await channel.send(payload);

    initPostRecord(sentMessage, author?.id || null);

    await sentMessage.edit({
        content: payload.content || null,
        embeds: [embed],
        components: [buildPostActionRow(sentMessage.id)]
    });

    return sentMessage;
}

module.exports = {
    publishApprovedPost
};
