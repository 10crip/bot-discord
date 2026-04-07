const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const CATEGORIA_ID = process.env.TICKET_CATEGORY_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const CANAL_AVALIACOES_ID = process.env.AVALIACOES_CHANNEL_ID;
const CANAL_POSTAGEM_ID = process.env.POST_CHANNEL_ID;

const postSessionsPath = path.join(__dirname, '../post_sessions.json');
const pendingPostsPath = path.join(__dirname, '../pending_posts.json');
const postLikesPath = path.join(__dirname, '../post_likes.json');

// =========================
// JSON utils
// =========================
function garantirArquivoJson(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf8');
    }
}

function lerJson(filePath) {
    garantirArquivoJson(filePath);
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}

function salvarJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            if (!interaction.isButton()) return;

            const guild = interaction.guild;
            const user = interaction.user;

            // =========================
            // ABRIR POSTAGEM
            // =========================
            if (interaction.customId === 'abrir_postagem') {
                const postSessions = lerJson(postSessionsPath);

                postSessions[user.id] = {
                    etapa: 'titulo'
                };

                salvarJson(postSessionsPath, postSessions);

                await interaction.reply({
                    content: '📩 Verifique seu privado para continuar.',
                    ephemeral: true
                });

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 30000);

                await user.send('📝 Envie o título da sua postagem.');

                return;
            }

            // =========================
            // SISTEMA DE LIKES
            // =========================
            if (interaction.customId.startsWith('like_post_')) {
                const postId = interaction.customId.replace('like_post_', '');
                const postLikes = lerJson(postLikesPath);

                if (!postLikes[postId]) {
                    postLikes[postId] = { userIds: [] };
                }

                const index = postLikes[postId].userIds.indexOf(user.id);

                if (index !== -1) {
                    postLikes[postId].userIds.splice(index, 1);
                } else {
                    postLikes[postId].userIds.push(user.id);
                }

                salvarJson(postLikesPath, postLikes);

                const total = postLikes[postId].userIds.length;

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`like_post_${postId}`)
                        .setLabel(`❤️ ${total}`)
                        .setStyle(ButtonStyle.Danger)
                );

                await interaction.update({ components: [row] });

                let lista = 'Ninguém curtiu ainda.';
                if (postLikes[postId].userIds.length > 0) {
                    const users = await Promise.all(
                        postLikes[postId].userIds.map(id =>
                            interaction.client.users.fetch(id).catch(() => null)
                        )
                    );

                    lista = users.filter(Boolean).map(u => `• ${u.tag}`).join('\n');
                }

                const msg = await interaction.followUp({
                    content: `❤️ Curtidas:\n\n${lista}`,
                    ephemeral: true,
                    fetchReply: true
                });

                setTimeout(() => {
                    interaction.webhook.deleteMessage(msg.id).catch(() => {});
                }, 25000);

                return;
            }

            // =========================
            // APROVAR POST
            // =========================
            if (interaction.customId.startsWith('aprovar_post_')) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({
                        content: '❌ Apenas staff.',
                        ephemeral: true
                    });
                }

                const pendingPosts = lerJson(pendingPostsPath);
                const postId = interaction.customId.replace('aprovar_post_', '');
                const post = pendingPosts[postId];

                if (!post) return;

                const canal = await interaction.client.channels.fetch(CANAL_POSTAGEM_ID);
                const userPost = await interaction.client.users.fetch(post.userId);

                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: userPost.username,
                        iconURL: userPost.displayAvatarURL()
                    })
                    .setTitle(post.titulo)
                    .setColor('Purple')
                    .setTimestamp();

                const postLikes = lerJson(postLikesPath);
                postLikes[postId] = { userIds: [] };
                salvarJson(postLikesPath, postLikes);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`like_post_${postId}`)
                        .setLabel('❤️ 0')
                        .setStyle(ButtonStyle.Danger)
                );

                if (post.mediaType === 'image') {
                    embed.setImage(post.mediaUrl);
                    await canal.send({ embeds: [embed], components: [row] });
                } else {
                    embed.addFields({
                        name: '🎬 Vídeo',
                        value: post.mediaUrl
                    });

                    await canal.send({
                        embeds: [embed],
                        files: [post.mediaUrl],
                        components: [row]
                    });
                }

                delete pendingPosts[postId];
                salvarJson(pendingPostsPath, pendingPosts);

                return interaction.update({
                    content: '✅ Post aprovado',
                    embeds: [],
                    components: []
                });
            }

            // =========================
            // RECUSAR POST
            // =========================
            if (interaction.customId.startsWith('recusar_post_')) {
                const pendingPosts = lerJson(pendingPostsPath);
                const postId = interaction.customId.replace('recusar_post_', '');

                delete pendingPosts[postId];
                salvarJson(pendingPostsPath, pendingPosts);

                return interaction.update({
                    content: '❌ Post recusado',
                    embeds: [],
                    components: []
                });
            }

            // =========================
            // TICKET PREMIUM
            // =========================
            if (
                interaction.customId === 'abrir_ticket_suporte' ||
                interaction.customId === 'abrir_ticket_parceria'
            ) {
                const tipo = interaction.customId.includes('suporte') ? 'Suporte' : 'Parceria';

                const canal = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: CATEGORIA_ID
                });

                const embed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket ${tipo}`)
                    .setDescription(
                        `Olá ${user}, descreva seu problema.\n\n` +
                        `A equipe irá te atender em breve.`
                    )
                    .setColor('#5865F2')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fechar_ticket_${user.id}`)
                        .setLabel('Fechar')
                        .setStyle(ButtonStyle.Danger)
                );

                await canal.send({
                    content: `${user}`,
                    embeds: [embed],
                    components: [row]
                });

                await interaction.reply({
                    content: `🎫 Ticket criado: ${canal}`,
                    ephemeral: true
                });

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 30000);

                return;
            }

            // =========================
            // FECHAR TICKET
            // =========================
            if (interaction.customId.startsWith('fechar_ticket_')) {
                await interaction.reply('🔒 Fechando...');
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 2000);
            }

        } catch (err) {
            console.error(err);
        }
    }
};
