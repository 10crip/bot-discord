require('dotenv').config();
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

const CANAL_APROVACAO_ID = '1490959069811445821';

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        // =========================
        // SISTEMA DE POSTAGEM POR DM
        // =========================
        if (!message.guild) {
            delete require.cache[require.resolve('../post_sessions.json')];
            delete require.cache[require.resolve('../pending_posts.json')];

            const postSessions = require('../post_sessions.json');
            const pendingPosts = require('../pending_posts.json');

            const sessao = postSessions[message.author.id];
            if (!sessao) return;

            if (sessao.etapa === 'titulo') {
                const titulo = message.content.trim();

                if (!titulo) {
                    return message.reply('❌ Envie um título válido para a postagem.');
                }

                sessao.titulo = titulo;
                sessao.etapa = 'midia';

                fs.writeFileSync('./post_sessions.json', JSON.stringify(postSessions, null, 2));

                return message.reply(
                    '✅ Título salvo com sucesso.\n\n' +
                    'Agora envie a **imagem ou vídeo** da postagem.'
                );
            }

            if (sessao.etapa === 'midia') {
                const anexo = message.attachments.first();

                if (!anexo) {
                    return message.reply('❌ Envie uma imagem ou um vídeo para concluir sua postagem.');
                }

                const tipo = anexo.contentType || '';
                const ehImagem = tipo.startsWith('image/');
                const ehVideo = tipo.startsWith('video/');

                if (!ehImagem && !ehVideo) {
                    return message.reply('❌ O arquivo enviado precisa ser uma imagem ou um vídeo.');
                }

                try {
                    const canalAprovacao = await client.channels.fetch(CANAL_APROVACAO_ID);

                    const postId = `${message.author.id}_${Date.now()}`;

                    pendingPosts[postId] = {
                        userId: message.author.id,
                        titulo: sessao.titulo,
                        mediaUrl: anexo.url,
                        mediaType: ehImagem ? 'image' : 'video',
                        criadoEm: Date.now()
                    };

                    fs.writeFileSync('./pending_posts.json', JSON.stringify(pendingPosts, null, 2));
                    delete postSessions[message.author.id];
                    fs.writeFileSync('./post_sessions.json', JSON.stringify(postSessions, null, 2));

                    const embed = new EmbedBuilder()
                        .setTitle('📝 Nova postagem aguardando aprovação')
                        .setDescription(
                            'Uma nova postagem foi enviada pela comunidade e está aguardando revisão da staff.'
                        )
                        .addFields(
                            { name: 'Autor', value: `${message.author.tag}`, inline: true },
                            { name: 'ID do autor', value: `${message.author.id}`, inline: true },
                            { name: 'Tipo de mídia', value: ehImagem ? 'Imagem' : 'Vídeo', inline: true },
                            { name: 'Título', value: sessao.titulo, inline: false }
                        )
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .setColor('Yellow')
                        .setFooter({ text: `Post ID: ${postId}` })
                        .setTimestamp();

                    if (ehImagem) {
                        embed.setImage(anexo.url);
                    } else {
                        embed.addFields({
                            name: 'Vídeo enviado',
                            value: `[Clique aqui para abrir o vídeo](${anexo.url})`,
                            inline: false
                        });
                    }

                    const {
                        ActionRowBuilder,
                        ButtonBuilder,
                        ButtonStyle
                    } = require('discord.js');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`aprovar_post_${postId}`)
                            .setLabel('Aprovar')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`recusar_post_${postId}`)
                            .setLabel('Recusar')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await canalAprovacao.send({
                        embeds: [embed],
                        components: [row]
                    });

                    return message.reply(
                        '✅ Sua postagem foi enviada para análise da staff.\n\n' +
                        'Assim que ela for aprovada ou recusada, você será avisado no privado.'
                    );
                } catch (error) {
                    console.error('Erro ao enviar postagem para aprovação:', error);
                    return message.reply('❌ Ocorreu um erro ao enviar sua postagem para análise.');
                }
            }

            return;
        }

        // =========================
        // SISTEMA DE COMANDOS
        // =========================
        const prefix = process.env.PREFIX;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();

        const command = client.commands.get(cmd);
        if (command) {
            command.execute(message, args);
        }
    }
};
