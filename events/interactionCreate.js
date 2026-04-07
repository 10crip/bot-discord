const {
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

const CATEGORIA_ID = '1490905371601145939';
const STAFF_ROLE_ID = '1490946877175369891';
const CANAL_AVALIACOES_ID = '1490951429962203267';

async function buscarTodasMensagens(channel) {
    let todasMensagens = [];
    let ultimaMensagemId = null;

    while (true) {
        const options = { limit: 100 };
        if (ultimaMensagemId) {
            options.before = ultimaMensagemId;
        }

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
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;
        const fs = require('fs');
        const postSessions = require('../post_sessions.json');

        if (interaction.customId === 'abrir_postagem') {
            postSessions[interaction.user.id] = {
                etapa: 'titulo'
            };

            fs.writeFileSync('./post_sessions.json', JSON.stringify(postSessions, null, 2));

            try {
                await interaction.user.send(
                    '📸 **Vamos criar sua postagem!**\n\n' +
                    'Envie agora o **título da postagem**.'
                );

                return interaction.reply({
                    content: '✅ Te chamei no privado para continuar sua postagem.',
                    ephemeral: true
                });
            } catch (error) {
                return interaction.reply({
                    content: '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.',
                    ephemeral: true
                });
            }
        }
        const guild = interaction.guild;
        const user = interaction.user;

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
                    .setTitle(`🎫 Ticket de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)
                    .setDescription(
                        `${user}, seu ticket foi criado com sucesso.\n\n` +
                        `Aguarde um membro da equipe assumir seu atendimento.`
                    )
                    .setColor(tipo === 'suporte' ? 'Blue' : 'Green')
                    .setFooter({ text: `Tipo: ${tipo}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`assumir_ticket_${user.id}`)
                        .setLabel('Assumir Ticket')
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId(`fechar_ticket_${user.id}`)
                        .setLabel('Fechar Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

                await canal.send({
                    content: `${user} <@&${STAFF_ROLE_ID}>`,
                    embeds: [embed],
                    components: [row]
                });

                return interaction.reply({
                    content: `✅ Seu ticket foi criado: ${canal}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Erro ao criar ticket:', error);
                return interaction.reply({
                    content: '❌ Ocorreu um erro ao criar seu ticket.',
                    ephemeral: true
                });
            }
        }

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
                    .setColor('Green');

                return interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Erro ao assumir ticket:', error);
                return interaction.reply({
                    content: '❌ Não consegui assumir este ticket.',
                    ephemeral: true
                });
            }
        }

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
    }
};
