const { EmbedBuilder } = require('discord.js');
const { setApprovalChannel, getGuildConfig } = require('../utils/guildConfig');
const { isStaff } = require('../utils/staff');
const { getPendingPostsByGuild, updatePendingPost } = require('../utils/pendingPosts');

function buildApprovalEmbed(client, guild, post) {
    const user = client.users.cache.get(post.authorId);

    return new EmbedBuilder()
        .setTitle('📨 Nova postagem para aprovação')
        .setColor('#FEE75C')
        .addFields(
            { name: 'Autor', value: user ? `${user.tag} (${user.id})` : `<@${post.authorId}>`, inline: false },
            { name: 'Título', value: post.title || 'Sem título', inline: false },
            { name: 'Tipo de mídia', value: post.mediaType || 'desconhecido', inline: true },
            { name: 'Post ID', value: post.id, inline: true }
        )
        .setFooter({ text: `Servidor: ${guild.name}` })
        .setTimestamp(new Date(post.createdAt));
}

module.exports = {
    name: 'verificarpost',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!isStaff(message.member, message.guild.id)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        setApprovalChannel(message.guild.id, message.channel.id);

        const guildConfig = getGuildConfig(message.guild.id);
        const pendingPosts = getPendingPostsByGuild(message.guild.id)
            .filter(post => post.status === 'pending' && !post.approvalMessageId);

        const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Canal de aprovação configurado')
            .setColor('#57F287')
            .setDescription(`Este canal agora é o canal de aprovação de posts deste servidor.\n\nCanal: ${message.channel}`);

        await message.reply({ embeds: [confirmEmbed] });

        if (!pendingPosts.length) {
            return;
        }

        for (const post of pendingPosts) {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`post_approve_${post.id}`)
                    .setLabel('Aprovar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`post_reject_${post.id}`)
                    .setLabel('Recusar')
                    .setStyle(ButtonStyle.Danger)
            );

            const embed = buildApprovalEmbed(message.client, message.guild, post);

            const files = [];
            if (post.attachmentUrl && post.mediaType === 'video') {
                files.push(post.attachmentUrl);
            }

            if (post.mediaType === 'image' && post.attachmentUrl) {
                embed.setImage(post.attachmentUrl);
            } else if (post.attachmentUrl) {
                embed.addFields({
                    name: 'Arquivo',
                    value: `[Clique para visualizar](${post.attachmentUrl})`,
                    inline: false
                });
            }

            const approvalMessage = await message.channel.send({
                embeds: [embed],
                components: [row],
                files
            });

            updatePendingPost(post.id, {
                approvalChannelId: guildConfig.approvalChannelId,
                approvalMessageId: approvalMessage.id
            });
        }
    }
};