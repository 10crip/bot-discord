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

async function buscarTodasMensagens(channel) {
    let todasMensagens = [];
    let ultimaMensagemId = null;

    while (true) {
        const options = { limit: 100 };
        if (ultimaMensagemId) options.before = ultimaMensagemId;

        const mensagens = await channel.messages.fetch(options);
        if (!mensagens.size) break;

        todasMensagens.push(...mensagens.values());
        ultimaMensagemId = mensagens.last().id;

        if (mensagens.size < 100) break;
    }

    return todasMensagens.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function gerarTranscript(channel) {
    const mensagens = await buscarTodasMensagens(channel);

    let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Transcript - ${escaparHtml(channel.name)}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #1e1f22;
                color: #ffffff;
                padding: 20px;
                line-height: 1.5;
            }
            h1 {
                color: #5865F2;
            }
            .info {
                margin-bottom: 20px;
                padding: 12px;
                background: #2b2d31;
                border-radius: 8px;
            }
            .msg {
                background: #2b2d31;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                border-left: 4px solid #5865F2;
            }
            .author {
                font-weight: bold;
                color: #58a6ff;
            }
            .time {
                color: #b5bac1;
                font-size: 12px;
                margin-left: 8px;
            }
            .content {
                margin-top: 8px;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .attachment {
                margin-top: 8px;
                font-size: 14px;
            }
            .attachment a {
                color: #79c0ff;
                text-decoration: none;
            }
            .attachment a:hover {
                text-decoration: underline;
            }
            .embed {
                margin-top: 10px;
                padding: 10px;
                background: #232428;
                border-left: 4px solid #00b0f4;
                border-radius: 6px;
            }
        </style>
    </head>
    <body>
        <h1>Histórico do Ticket</h1>
        <div class="info">
            <strong>Canal:</strong> ${escaparHtml(channel.name)}<br>
            <strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}
        </div>
    `;

    for (const msg of mensagens) {
        const autor = escaparHtml(msg.author?.tag || 'Usuário desconhecido');
        const horario = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
        const conteudo = msg.content ? escaparHtml(msg.content) : '[sem texto]';

        html += `
        <div class="msg">
            <span class="author">${autor}</span>
            <span class="time">${horario}</span>
            <div class="content">${conteudo}</div>
        `;

        if (msg.attachments.size > 0) {
            html += `<div class="attachment"><strong>Anexos:</strong><br>`;
            msg.attachments.forEach(att => {
                html += `<a href="${escaparHtml(att.url)}" target="_blank">${escaparHtml(att.name || 'arquivo')}</a><br>`;
            });
            html += `</div>`;
        }

        if (msg.embeds.length > 0) {
            html += `<div class="embed"><strong>Embed(s):</strong><br>`;
            msg.embeds.forEach((embed, i) => {
                html += `Embed ${i + 1}<br>`;
                if (embed.title) html += `Título: ${escaparHtml(embed.title)}<br>`;
                if (embed.description) html += `Descrição: ${escaparHtml(embed.description)}<br>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
    }

    html += `
    </body>
    </html>
    `;

    const filePath = path.join(__dirname, `../transcript-${channel.id}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            if (!interaction.isButton()) return;

            const guild = interaction.guild;
            const user = interaction.user;

            // =========================
            // SISTEMA DE ABRIR POSTAGEM
            // =========================
            if (interaction.customId === 'abrir_postagem') {
                const postSessions = lerJson(postSessionsPath);

                postSessions[user.id] = {
                    etapa: 'titulo'
                };

                salvarJson(postSessionsPath, postSessions);

                await interaction.reply({
                    content: '✨ Verifique seu privado para começar sua postagem.',
                    ephemeral: true
                });

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 30000);

                try {
                    const embedDM = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🚀 Criação de Postagem')
                        .setDescription(
                            'Seu conteúdo está a um passo de aparecer para toda a comunidade.\n\n' +
                            '📝 Envie agora o **título da sua postagem**.\n\n' +
                            'Capriche — um bom título chama mais atenção.'
                        )
                        .setFooter({ text: 'Sistema de Postagens • Etapa 1 de 2' })
                        .setTimestamp();

                    await user.send({ embeds: [embedDM] });
                } catch (dmError) {
                    console.error('Erro ao enviar DM:', dmError);

                    await interaction.followUp({
                        content: '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.',
                        ephemeral: true
                    }).catch(() => {});
                }

                return;
            }

            // =========================
            // SISTEMA DE APROVAÇÃO DE POSTAGEM
            // =========================
            if (interaction.customId.startsWith('aprovar_post_')) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({
                        content: '❌ Apenas a staff pode aprovar postagens.',
                        ephemeral: true
                    });
                }

                const pendingPosts = lerJson(pendingPostsPath);
                const postId = interaction.customId.replace('aprovar_post_', '');
                const post = pendingPosts[postId];

                if (!post) {
                    return interaction.reply({
                        content: '❌ Esta postagem não foi encontrada ou já foi processada.',
                        ephemeral: true
                    });
                }

                try {
                    const canalPostagem = await interaction.client.channels.fetch(CANAL_POSTAGEM_ID);
                    const usuario = await interaction.client.users.fetch(post.userId);

                    const embed = new EmbedBuilder()
                        .setAuthor({
                            name: usuario.username,
                            iconURL: usuario.displayAvatarURL({ dynamic: true })
                        })
                        .setTitle(post.titulo)
                        .setDescription('✨ **Nova postagem enviada pela comunidade**')
                        .setColor('Purple')
                        .setFooter({ text: 'Postagem da comunidade' })
                        .setTimestamp();

                    if (post.mediaType === 'image') {
                        embed.setImage(post.mediaUrl);
                        await canalPostagem.send({ embeds: [embed] });
                    } else {
                        embed.addFields({
                            name: '🎬 Vídeo da postagem',
                            value: `[Clique aqui para assistir ao vídeo](${post.mediaUrl})`
                        });

                        await canalPostagem.send({
                            embeds: [embed],
                            files: [post.mediaUrl]
                        });
                    }

                    await usuario.send(
                        '✅ Sua postagem foi **aprovada** pela staff e já foi publicada no servidor.'
                    ).catch(() => {});

                    delete pendingPosts[postId];
                    salvarJson(pendingPostsPath, pendingPosts);

                    const embedResposta = new EmbedBuilder()
                        .setTitle('✅ Postagem aprovada')
                        .setDescription(`A postagem de <@${post.userId}> foi aprovada por ${interaction.user}.`)
                        .setColor('Green')
                        .setTimestamp();

                    return interaction.update({
                        embeds: [embedResposta],
                        components: []
                    });
                } catch (error) {
                    console.error('Erro ao aprovar postagem:', error);
                    return interaction.reply({
                        content: '❌ Ocorreu um erro ao aprovar a postagem.',
                        ephemeral: true
                    });
                }
            }

            if (interaction.customId.startsWith('recusar_post_')) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({
                        content: '❌ Apenas a staff pode recusar postagens.',
                        ephemeral: true
                    });
                }

                const pendingPosts = lerJson(pendingPostsPath);
                const postId = interaction.customId.replace('recusar_post_', '');
                const post = pendingPosts[postId];

                if (!post) {
                    return interaction.reply({
                        content: '❌ Esta postagem não foi encontrada ou já foi processada.',
                        ephemeral: true
                    });
                }

                try {
                    const usuario = await interaction.client.users.fetch(post.userId);

                    await usuario.send(
                        '❌ Sua postagem foi **recusada** pela staff. Você pode ajustar o conteúdo e tentar novamente depois.'
                    ).catch(() => {});

                    delete pendingPosts[postId];
                    salvarJson(pendingPostsPath, pendingPosts);

                    const embedResposta = new EmbedBuilder()
                        .setTitle('❌ Postagem recusada')
                        .setDescription(`A postagem de <@${post.userId}> foi recusada por ${interaction.user}.`)
                        .setColor('Red')
                        .setTimestamp();

                    return interaction.update({
                        embeds: [embedResposta],
                        components: []
                    });
                } catch (error) {
                    console.error('Erro ao recusar postagem:', error);
                    return interaction.reply({
                        content: '❌ Ocorreu um erro ao recusar a postagem.',
                        ephemeral: true
                    });
                }
            }

            // =========================
            // SISTEMA DE TICKET - ABRIR PREMIUM
            // =========================
            if (
                interaction.customId === 'abrir_ticket_suporte' ||
                interaction.customId === 'abrir_ticket_parceria'
            ) {
                const tipo = interaction.customId === 'abrir_ticket_suporte' ? 'suporte' : 'parceria';

                const nomeLimpo = user.username
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '');

                const nomeCanal = `ticket-${nomeLimpo}`;

                const ticketExistente = guild.channels.cache.find(
                    channel =>
                        channel.parentId === CATEGORIA_ID &&
                        channel.topic === `ticket-${user.id}`
                );

                if (ticketExistente) {
                    return interaction.reply({
                        content: `❌ Você já possui um ticket aberto: ${ticketExistente}`,
                        ephemeral: true
                    });
                }

                try {
                    const canal = await guild.channels.create({
                        name: nomeCanal,
                        type: ChannelType.GuildText,
                        parent: CATEGORIA_ID,
                        topic: `ticket-${user.id}`,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionsBitField.Flags.ViewChannel]
                            },
                            {
                                id: user.id,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory,
                                    PermissionsBitField.Flags.AttachFiles,
                                    PermissionsBitField.Flags.EmbedLinks
                                ]
                            },
                            {
                                id: STAFF_ROLE_ID,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory,
                                    PermissionsBitField.Flags.AttachFiles,
                                    PermissionsBitField.Flags.EmbedLinks
                                ]
                            }
                        ]
                    });

                    const embed = new EmbedBuilder()
                        .setColor(tipo === 'suporte' ? '#5865F2' : '#57F287')
                        .setTitle(`🎫 Ticket de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)
                        .setDescription(
                            `Olá ${user}, seu atendimento foi aberto com sucesso.\n\n` +
                            'Nossa equipe foi notificada e em breve alguém assumirá seu ticket.'
                        )
                        .addFields(
                            {
                                name: '👤 Solicitante',
                                value: `${user}`,
                                inline: true
                            },
                            {
                                name: '📂 Categoria',
                                value: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                                inline: true
                            },
                            {
                                name: '📌 Instruções',
                                value: 'Explique seu caso com o máximo de detalhes possível para agilizar o atendimento.',
                                inline: false
                            }
                        )
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `${guild.name} • Sistema de Tickets` })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`assumir_ticket_${user.id}`)
                            .setLabel('Assumir Ticket')
                            .setEmoji('👤')
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(`fechar_ticket_${user.id}`)
                            .setLabel('Fechar Ticket')
                            .setEmoji('🔒')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await canal.send({
                        content: `${user} <@&${STAFF_ROLE_ID}>`,
                        embeds: [embed],
                        components: [row]
                    });

                    await interaction.reply({
                        content: `🎫 Seu atendimento foi criado com sucesso: ${canal}`,
                        ephemeral: true
                    });

                    setTimeout(() => {
                        interaction.deleteReply().catch(() => {});
                    }, 30000);

                    return;
                } catch (error) {
                    console.error('Erro ao criar ticket:', error);
                    return interaction.reply({
                        content: '❌ Ocorreu um erro ao criar seu ticket.',
                        ephemeral: true
                    });
                }
            }

            // =========================
            // SISTEMA DE TICKET - ASSUMIR
            // =========================
            if (interaction.customId.startsWith('assumir_ticket_')) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({
                        content: '❌ Apenas a equipe staff pode assumir tickets.',
                        ephemeral: true
                    });
                }

                const userId = interaction.customId.replace('assumir_ticket_', '');
                const canal = interaction.channel;

                try {
                    await canal.permissionOverwrites.set([
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: userId,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.EmbedLinks
                            ]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.EmbedLinks,
                                PermissionsBitField.Flags.ManageChannels
                            ]
                        }
                    ]);

                    const embed = new EmbedBuilder()
                        .setTitle('👤 Ticket assumido')
                        .setDescription(`${interaction.user} assumiu este ticket e agora está responsável pelo atendimento.`)
                        .setColor('Green')
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Erro ao assumir ticket:', error);
                    return interaction.reply({
                        content: '❌ Não consegui assumir este ticket.',
                        ephemeral: true
                    });
                }
            }

            // =========================
            // SISTEMA DE TICKET - FECHAR
            // =========================
            if (interaction.customId.startsWith('fechar_ticket_')) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({
                        content: '❌ Apenas a equipe staff pode fechar tickets.',
                        ephemeral: true
                    });
                }

                const userId = interaction.customId.replace('fechar_ticket_', '');
                const canal = interaction.channel;

                try {
                    await interaction.reply('🔒 Fechando ticket e gerando histórico completo...');

                    const transcriptPath = await gerarTranscript(canal);
                    const usuario = await interaction.client.users.fetch(userId).catch(() => null);

                    if (usuario) {
                        const attachment = new AttachmentBuilder(transcriptPath);

                        const embedAgradecimento = new EmbedBuilder()
                            .setTitle('💬 Atendimento finalizado')
                            .setDescription(
                                'Obrigado por fazer parte da comunidade.\n\n' +
                                'Seu ticket foi encerrado e estamos enviando o histórico completo do atendimento.\n' +
                                'Também queremos saber como foi sua experiência.'
                            )
                            .setColor('Blue');

                        const estrelas = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`avaliar_1_${interaction.user.id}_${userId}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`avaliar_2_${interaction.user.id}_${userId}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`avaliar_3_${interaction.user.id}_${userId}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`avaliar_4_${interaction.user.id}_${userId}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`avaliar_5_${interaction.user.id}_${userId}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
                        );

                        await usuario.send({
                            embeds: [embedAgradecimento],
                            files: [attachment],
                            components: [estrelas]
                        }).catch(() => {
                            console.log('Não foi possível enviar DM para o usuário.');
                        });
                    }

                    setTimeout(async () => {
                        try {
                            if (fs.existsSync(transcriptPath)) fs.unlinkSync(transcriptPath);
                            await canal.delete();
                        } catch (error) {
                            console.error('Erro ao deletar canal:', error);
                        }
                    }, 3000);
                } catch (error) {
                    console.error('Erro ao fechar ticket:', error);
                    return interaction.followUp({
                        content: '❌ Ocorreu um erro ao fechar o ticket.',
                        ephemeral: true
                    });
                }
            }

            // =========================
            // SISTEMA DE AVALIAÇÃO
            // =========================
            if (interaction.customId.startsWith('avaliar_')) {
                const partes = interaction.customId.split('_');
                const nota = partes[1];
                const staffId = partes[2];
                const clienteId = partes[3];

                if (interaction.user.id !== clienteId) {
                    return interaction.reply({
                        content: '❌ Apenas a pessoa atendida pode fazer esta avaliação.',
                        ephemeral: true
                    });
                }

                const canalAvaliacoes = await interaction.client.channels.fetch(CANAL_AVALIACOES_ID).catch(() => null);
                const staffUser = await interaction.client.users.fetch(staffId).catch(() => null);

                if (canalAvaliacoes) {
                    const embed = new EmbedBuilder()
                        .setTitle('⭐ Nova avaliação de atendimento')
                        .addFields(
                            { name: 'Cliente', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Staff', value: staffUser ? `${staffUser.tag}` : `ID: ${staffId}`, inline: true },
                            { name: 'Nota', value: `${'⭐'.repeat(Number(nota))} (${nota}/5)`, inline: false }
                        )
                        .setColor('Gold')
                        .setTimestamp();

                    await canalAvaliacoes.send({ embeds: [embed] });
                }

                return interaction.reply({
                    content: `✅ Obrigado pela sua avaliação de ${nota} estrela(s)!`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erro geral no interactionCreate:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar esta interação.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
