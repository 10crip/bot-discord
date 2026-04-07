const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const PREFIX = process.env.PREFIX || '!';
const CANAL_APROVACAO_ID = process.env.POST_APPROVAL_CHANNEL_ID;

const postSessionsPath = path.join(__dirname, '../post_sessions.json');
const pendingPostsPath = path.join(__dirname, '../pending_posts.json');

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
    name: Events.MessageCreate,

    async execute(message, client) {
        try {
            if (message.author.bot) return;

            // =========================
            // COMANDOS COM PREFIXO
            // =========================
            if (message.guild && message.content.startsWith(PREFIX)) {
                const args = message.content.slice(PREFIX.length).trim().split(/ +/);
                const commandName = args.shift()?.toLowerCase();

                const command = client.commands.get(commandName);
                if (!command) return;

                try {
                    await command.execute(message, args, client);
                } catch (error) {
                    console.error(`Erro ao executar comando ${commandName}:`, error);
                    await message.reply('❌ Ocorreu um erro ao executar este comando.');
                }

                return;
            }

            // =========================
            // SISTEMA DE POSTAGEM NA DM
            // =========================
            if (!message.guild) {
                const postSessions = lerJson(postSessionsPath);
                const pendingPosts = lerJson(pendingPostsPath);

                const session = postSessions[message.author.id];
                if (!session) return;

                // =========================
                // ETAPA 1 - TÍTULO
                // =========================
                if (session.etapa === 'titulo') {
                    const titulo = message.content.trim();

                    if (!titulo) {
                        await message.reply('❌ Envie um título válido para a sua postagem.');
                        return;
                    }

                    if (titulo.length < 3) {
                        await message.reply('❌ O título precisa ter pelo menos 3 caracteres.');
                        return;
                    }

                    if (titulo.length > 100) {
                        await message.reply('❌ O título pode ter no máximo 100 caracteres.');
                        return;
                    }

                    postSessions[message.author.id] = {
                        etapa: 'midia',
                        titulo
                    };

                    salvarJson(postSessionsPath, postSessions);

                    const embedMidia = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📸 Envio de mídia')
                        .setDescription(
                            'Perfeito! Seu título foi salvo com sucesso.\n\n' +
                            `**Título:** ${titulo}\n\n` +
                            'Agora envie a **imagem ou vídeo** que será usado na postagem.'
                        )
                        .addFields(
                            {
                                name: '✅ Aceito',
                                value: 'Imagem ou vídeo enviado diretamente nesta conversa.',
                                inline: false
                            },
                            {
                                name: '💡 Dica',
                                value: 'Escolha uma mídia de boa qualidade para chamar mais atenção.',
                                inline: false
                            }
                        )
                        .setFooter({ text: 'Sistema de Postagens • Etapa 2 de 2' })
                        .setTimestamp();

                    await message.reply({ embeds: [embedMidia] });
                    return;
                }

                // =========================
                // ETAPA 2 - MÍDIA
                // =========================
                if (session.etapa === 'midia') {
                    if (!message.attachments.size) {
                        await message.reply('❌ Agora envie uma imagem ou vídeo para continuar.');
                        return;
                    }

                    const attachment = message.attachments.first();
                    const contentType = attachment.contentType || '';

                    let mediaType = null;

                    if (contentType.startsWith('image/')) {
                        mediaType = 'image';
                    } else if (contentType.startsWith('video/')) {
                        mediaType = 'video';
                    } else {
                        await message.reply('❌ O arquivo enviado precisa ser uma imagem ou vídeo.');
                        return;
                    }

                    const postId = Date.now().toString();

                    pendingPosts[postId] = {
                        userId: message.author.id,
                        titulo: session.titulo,
                        mediaUrl: attachment.url,
                        mediaType
                    };

                    salvarJson(pendingPostsPath, pendingPosts);

                    delete postSessions[message.author.id];
                    salvarJson(postSessionsPath, postSessions);

                    const canalAprovacao = await client.channels.fetch(CANAL_APROVACAO_ID).catch(() => null);

                    if (!canalAprovacao) {
                        await message.reply('❌ Não encontrei o canal de aprovação configurado.');
                        return;
                    }

                    const embedAprovacao = new EmbedBuilder()
                        .setColor('#F1C40F')
                        .setTitle('📝 Nova postagem pendente')
                        .setDescription(
                            `**Autor:** <@${message.author.id}>\n` +
                            `**Título:** ${session.titulo}\n` +
                            `**Tipo:** ${mediaType === 'image' ? 'Imagem' : 'Vídeo'}`
                        )
                        .setFooter({ text: `Post ID: ${postId}` })
                        .setTimestamp();

                    if (mediaType === 'image') {
                        embedAprovacao.setImage(attachment.url);
                    } else {
                        embedAprovacao.addFields({
                            name: '🎬 Vídeo enviado',
                            value: `[Clique aqui para abrir o vídeo](${attachment.url})`
                        });
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`aprovar_post_${postId}`)
                            .setLabel('Aprovar')
                            .setEmoji('✅')
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(`recusar_post_${postId}`)
                            .setLabel('Recusar')
                            .setEmoji('❌')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await canalAprovacao.send({
                        embeds: [embedAprovacao],
                        components: [row]
                    });

                    const embedFinal = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ Postagem enviada para análise')
                        .setDescription(
                            'Sua postagem foi enviada com sucesso para a equipe.\n\n' +
                            'Assim que ela for **aprovada** ou **recusada**, você será avisado aqui no privado.'
                        )
                        .addFields(
                            {
                                name: '📌 Resumo da postagem',
                                value:
                                    `**Título:** ${session.titulo}\n` +
                                    `**Tipo:** ${mediaType === 'image' ? 'Imagem' : 'Vídeo'}`,
                                inline: false
                            }
                        )
                        .setFooter({ text: 'Sistema de Postagens • Enviado para análise' })
                        .setTimestamp();

                    await message.reply({ embeds: [embedFinal] });
                    return;
                }
            }
        } catch (error) {
            console.error('Erro no messageCreate:', error);
        }
    }
};
