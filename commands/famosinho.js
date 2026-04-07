const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const postInteractionsFile = path.join(dataDir, 'postInteractions.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(postInteractionsFile)) {
        fs.writeFileSync(postInteractionsFile, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readData() {
    ensureFile();

    try {
        const raw = fs.readFileSync(postInteractionsFile, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Erro ao ler postInteractions.json:', error);
        return {};
    }
}

function getMedal(position) {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '✨';
}

module.exports = {
    name: 'famosinho',

    async execute(message) {
        try {
            const posts = readData();
            const ranking = {};

            for (const postId of Object.keys(posts)) {
                const post = posts[postId];
                if (!post || !post.authorId) continue;

                const totalLikes = Array.isArray(post.likes) ? post.likes.length : 0;

                if (!ranking[post.authorId]) {
                    ranking[post.authorId] = {
                        likes: 0,
                        posts: 0
                    };
                }

                ranking[post.authorId].likes += totalLikes;
                ranking[post.authorId].posts += 1;
            }

            const ordered = Object.entries(ranking)
                .sort((a, b) => b[1].likes - a[1].likes)
                .slice(0, 10);

            if (!ordered.length) {
                return message.reply('📉 Ainda não há likes suficientes para montar o ranking.');
            }

            const lines = await Promise.all(
                ordered.map(async ([userId, data], index) => {
                    const user = await message.client.users.fetch(userId).catch(() => null);
                    const displayName = user ? `<@${user.id}>` : `Usuário ${userId}`;
                    const medal = getMedal(index + 1);

                    return [
                        `${medal} **${index + 1}º lugar** — ${displayName}`,
                        `❤️ **${data.likes}** like(s) recebidos`,
                        `📝 **${data.posts}** postagem(ns) registrada(s)`
                    ].join('\n');
                })
            );

            const topUserId = ordered[0][0];
            const topUser = await message.client.users.fetch(topUserId).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🏆 Ranking dos mais famosinhos')
                .setDescription(lines.join('\n\n'))
                .setFooter({
                    text: 'Ranking baseado nos likes recebidos nas postagens'
                })
                .setTimestamp();

            if (topUser) {
                embed.setThumbnail(topUser.displayAvatarURL({ dynamic: true }));
            }

            return message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro no comando famosinho:', error);
            return message.reply('❌ Ocorreu um erro ao gerar o ranking.');
        }
    }
};
