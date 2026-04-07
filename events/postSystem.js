const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { sendPostToApproval } = require('../utils/postApprovalSystem');

const dataDir = path.join(__dirname, '..', 'data');
const sessionsFile = path.join(dataDir, 'post_sessions.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(sessionsFile)) {
        fs.writeFileSync(sessionsFile, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readSessions() {
    ensureFile();

    try {
        const raw = fs.readFileSync(sessionsFile, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Erro ao ler post_sessions.json:', error);
        return {};
    }
}

function saveSessions(data) {
    ensureFile();

    try {
        fs.writeFileSync(sessionsFile, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar post_sessions.json:', error);
    }
}

function getSession(userId) {
    const sessions = readSessions();
    return sessions[userId] || null;
}

function setSession(userId, sessionData) {
    const sessions = readSessions();
    sessions[userId] = sessionData;
    saveSessions(sessions);
}

function removeSession(userId) {
    const sessions = readSessions();
    if (sessions[userId]) {
        delete sessions[userId];
        saveSessions(sessions);
    }
}

function isImage(contentType) {
    return typeof contentType === 'string' && contentType.startsWith('image/');
}

function isVideo(contentType) {
    return typeof contentType === 'string' && contentType.startsWith('video/');
}

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        try {
            if (message.author.bot) return;
            if (message.guild) return;

            const session = getSession(message.author.id);
            if (!session) return;

            const userInput = message.content?.trim()?.toLowerCase();

            if (userInput === 'cancelar') {
                removeSession(message.author.id);

                const cancelEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Envio cancelado')
                    .setDescription('Sua sessão de postagem foi cancelada com sucesso.')
                    .setTimestamp();

                return message.reply({ embeds: [cancelEmbed] });
            }

            if (!session.guildId) {
                removeSession(message.author.id);

                const errorEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Sessão inválida')
                    .setDescription('Não foi possível identificar o servidor da sua postagem. Inicie o processo novamente.')
                    .setTimestamp();

                return message.reply({ embeds: [errorEmbed] });
            }

            if (session.step === 'awaiting_title') {
                const title = message.content?.trim();

                if (!title || title.length < 3) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FEE75C')
                                .setTitle('⚠️ Título inválido')
                                .setDescription('Envie um título com pelo menos **3 caracteres**.')
                                .setTimestamp()
                        ]
                    });
                }

                if (title.length > 256) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FEE75C')
                                .setTitle('⚠️ Título muito grande')
                                .setDescription('O título pode ter no máximo **256 caracteres**.')
                                .setTimestamp()
                        ]
                    });
                }

                setSession(message.author.id, {
                    ...session,
                    step: 'awaiting_media',
                    title
                });

                const nextEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🖼️ Agora envie a mídia')
                    .setDescription(
                        [
                            'Envie agora a **imagem ou vídeo** da postagem.',
                            '',
                            'Formatos aceitos:',
                            '• **Imagem**',
                            '• **Vídeo**',
                            '',
                            'Caso queira cancelar, envie **cancelar**.'
                        ].join('\n')
                    )
                    .setTimestamp();

                return message.reply({ embeds: [nextEmbed] });
            }

            if (session.step === 'awaiting_media') {
                const attachment = message.attachments.first();

                if (!attachment) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FEE75C')
                                .setTitle('⚠️ Nenhuma mídia encontrada')
                                .setDescription('Você precisa enviar uma **imagem** ou **vídeo** em anexo.')
                                .setTimestamp()
                        ]
                    });
                }

                const mediaType = attachment.contentType || '';
                const mediaUrl = attachment.url;

                if (!isImage(mediaType) && !isVideo(mediaType)) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FEE75C')
                                .setTitle('⚠️ Tipo de arquivo inválido')
                                .setDescription('Envie apenas **imagem** ou **vídeo**.')
                                .setTimestamp()
                        ]
                    });
                }

                const guild = await message.client.guilds.fetch(session.guildId).catch(() => null);

                if (!guild) {
                    removeSession(message.author.id);

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ED4245')
                                .setTitle('❌ Servidor não encontrado')
                                .setDescription('Não foi possível localizar o servidor dessa postagem. Inicie o processo novamente.')
                                .setTimestamp()
                        ]
                    });
                }

                try {
                    const postId = await sendPostToApproval({
                        client: message.client,
                        guild,
                        author: message.author,
                        title: session.title,
                        mediaUrl,
                        mediaType
                    });

                    removeSession(message.author.id);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ Postagem enviada para aprovação')
                        .setDescription(
                            [
                                'Sua postagem foi enviada com sucesso para a equipe responsável.',
                                '',
                                'Assim que ela for analisada, você receberá uma resposta no privado.'
                            ].join('\n')
                        )
                        .addFields(
                            { name: 'Título', value: session.title || 'Sem título', inline: false },
                            { name: 'ID da postagem', value: postId, inline: true },
                            { name: 'Tipo de mídia', value: isImage(mediaType) ? 'Imagem' : 'Vídeo', inline: true }
                        )
                        .setTimestamp();

                    return message.reply({ embeds: [successEmbed] });
                } catch (error) {
                    console.error('Erro ao enviar postagem para aprovação:', error);

                    removeSession(message.author.id);

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ED4245')
                                .setTitle('❌ Erro ao enviar postagem')
                                .setDescription(
                                    'Não foi possível enviar sua postagem para aprovação.\n' +
                                    'Verifique se o canal de aprovação foi configurado com `!verificarpost` e tente novamente.'
                                )
                                .setTimestamp()
                        ]
                    });
                }
            }
        } catch (error) {
            console.error('Erro no sistema de postagens por DM:', error);

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ Erro interno')
                        .setDescription('Ocorreu um erro ao processar sua postagem. Tente novamente mais tarde.')
                        .setTimestamp()
                ]
            }).catch(() => null);
        }
    }
};
