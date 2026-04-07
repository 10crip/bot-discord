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
            // CONTINUAÇÃO DA POSTAGEM NA DM
            // =========================
            if (!message.guild) {
                const postSessions = lerJson(postSessionsPath);
                const pendingPosts = lerJson(pendingPostsPath);

                const session = postSessions[message.author.id];
                if (!session) return;

                // ETAPA 1: RECEBER TÍTULO
                if (session.etapa === 'titulo') {
                    const titulo = message.content.trim();

                    if (!titulo) {
                        await message.reply('❌ Envie um título válido para a postagem.');
                        return;
                    }

                    postSessions[message.author.id] = {
                        etapa: 'midia',
                        titulo
                    };

                    salvarJson(postSessionsPath, postSessions);

                    await message.reply(
                        '✅ Título recebido.\n\n' +
                        'Agora envie a **imagem ou vídeo** da postagem.'
                    );
                    return;
                }

                // ETAPA 2: RECEBER MÍDIA
                if (session.etapa === 'midia') {
                    if (!message.attachments.size) {
                        await message.reply('❌ Agora você precisa enviar uma **imagem ou vídeo**.');
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
                        await message.reply('❌ O arquivo enviado precisa ser uma **imagem** ou **vídeo**.');
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

                    const embed = new EmbedBuilder()
                        .setTitle('📝 Nova postagem pendente')
                        .setDescription(
                            `**Autor:** <@${message.author.id}>\n` +
                            `**Título:** ${session.titulo}\n` +
                            `**Tipo de mídia:** ${mediaType === 'image' ? 'Imagem' : 'Vídeo'}`
                        )
                        .setColor('Yellow')
                        .setFooter({ text: `Post ID: ${postId}` })
                        .setTimestamp();

                    if (mediaType === 'image') {
                        embed.setImage(attachment.url);
                    } else {
                        embed.addFields({
                            name: '🎬 Vídeo',
                            value: `[Clique aqui para abrir o vídeo](${attachment.url})`
                        });
                    }

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

                    await message.reply(
                        '✅ Sua postagem foi enviada para aprovação da staff.\n\n' +
                        'Assim que ela for aprovada ou recusada, você será avisado no privado.'
                    );

                    return;
                }
            }
        } catch (error) {
            console.error('Erro no messageCreate:', error);
        }
    }
};
