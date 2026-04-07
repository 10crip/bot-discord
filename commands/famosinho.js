const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const postLikesPath = path.join(__dirname, '../post_likes.json');

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

module.exports = {
    name: 'famosinho',

    async execute(message) {
        try {
            const postLikes = lerJson(postLikesPath);
            const ranking = {};

            for (const postId of Object.keys(postLikes)) {
                const post = postLikes[postId];
                if (!post || !post.authorId) continue;

                const totalLikes = Array.isArray(post.userIds) ? post.userIds.length : 0;

                if (!ranking[post.authorId]) {
                    ranking[post.authorId] = 0;
                }

                ranking[post.authorId] += totalLikes;
            }

            const ordenado = Object.entries(ranking)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (!ordenado.length) {
                return message.reply('📉 Ainda não há likes suficientes para montar o ranking.');
            }

            const linhas = await Promise.all(
                ordenado.map(async ([userId, likes], index) => {
                    const usuario = await message.client.users.fetch(userId).catch(() => null);
                    const nome = usuario ? usuario.tag : `Usuário ${userId}`;
                    return `**${index + 1}.** ${nome} — **${likes} like(s)**`;
                })
            );

            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🏆 Ranking dos mais famosinhos')
                .setDescription(linhas.join('\n\n'))
                .setFooter({ text: 'Ranking baseado em likes recebidos nas postagens' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro no comando famosinho:', error);
            await message.reply('❌ Ocorreu um erro ao gerar o ranking.');
        }
    }
};