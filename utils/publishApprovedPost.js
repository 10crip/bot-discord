const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { createPostRecord } = require('./postInteractions');

async function publishApprovedPost({
    channel,
    title,
    mediaUrl,
    mediaType,
    author
}) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title || 'Sem título')

        // 👇 AQUI FICA O @ DO USUÁRIO (lado direito visual)
        .setAuthor({
            name: `@${author?.username || 'usuário'}`,
            iconURL: author?.displayAvatarURL({ dynamic: true })
        })

        .setFooter({
            text: `Post enviado por ${author?.username || 'usuário'}`
        })
        .setTimestamp();

    if (mediaUrl && mediaType?.startsWith('image/')) {
        embed.setImage(mediaUrl);
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('post_like_temp')
            .setLabel('Curtir (0)')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('post_comment_temp')
            .setLabel('Comentar (0)')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('post_view_comments_temp')
            .setLabel('Ver comentários')
            .setStyle(ButtonStyle.Secondary)
    );

    const sentMessage = await channel.send({
        embeds: [embed],
        components: [row]
    });

    // registra no sistema
    await createPostRecord({
        messageId: sentMessage.id,
        channelId: channel.id,
        authorId: author?.id
    });

    return sentMessage;
}

module.exports = {
    publishApprovedPost
};
