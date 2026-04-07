const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const { memberHasStaffRole } = require('../guildConfig');
const { approvePost, rejectPost } = require('../utils/postApprovalSystem');
const {
    getPostRecord,
    toggleLike,
    addComment,
    buildCommentsEmbed,
    refreshPostButtons
} = require('../utils/postInteractions');

const TICKET_CATEGORY_ID = '1490905371601145939';
const FEEDBACK_CHANNEL_ID = '1490951429962203267';
const EPHEMERAL_DELETE_DELAY = 20000;

const CALL_PANEL_CHANNEL_ID = '1491204291887763599';
const CALL_CATEGORY_ID = '1491183093749387364';
const CALL_CREATE_BUTTON_ID = 'criar_sua_call';
const CALL_CREATE_MODAL_ID = 'modal_criar_call';

const dataDir = path.join(__dirname, '..', 'data');
const ticketsFile = path.join(dataDir, 'tickets.json');
const postSessionsFile = path.join(dataDir, 'post_sessions.json');

function ensureJsonFile(filePath) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readJson(filePath) {
    ensureJsonFile(filePath);

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error(`Erro ao ler ${path.basename(filePath)}:`, error);
        return {};
    }
}

function saveJson(filePath, data) {
    ensureJsonFile(filePath);

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error(`Erro ao salvar ${path.basename(filePath)}:`, error);
    }
}

function getTicketByChannelId(channelId) {
    const tickets = readJson(ticketsFile);
    return tickets[channelId] || null;
}

function setTicketByChannelId(channelId, payload) {
    const tickets = readJson(ticketsFile);
    tickets[channelId] = {
        ...(tickets[channelId] || {}),
        ...payload
    };
    saveJson(ticketsFile, tickets);
    return tickets[channelId];
}

function createPostSession(userId, guildId, channelId) {
    const sessions = readJson(postSessionsFile);

    sessions[userId] = {
        guildId,
        channelId,
        step: 'awaiting_title',
        createdAt: Date.now()
    };

    saveJson(postSessionsFile, sessions);
}

function buildFeedbackButtons(ticketChannelId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_feedback:${ticketChannelId}:1`)
            .setLabel('⭐')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ticket_feedback:${ticketChannelId}:2`)
            .setLabel('⭐⭐')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ticket_feedback:${ticketChannelId}:3`)
            .setLabel('⭐⭐⭐')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ticket_feedback:${ticketChannelId}:4`)
            .setLabel('⭐⭐⭐⭐')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ticket_feedback:${ticketChannelId}:5`)
            .setLabel('⭐⭐⭐⭐⭐')
            .setStyle(ButtonStyle.Success)
    );
}

function disableFeedbackButtons(row) {
    return new ActionRowBuilder().addComponents(
        row.components.map(component => ButtonBuilder.from(component).setDisabled(true))
    );
}

async function replyTemp(interaction, payload) {
    const data = { ...payload, ephemeral: true };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(data).catch(() => null);
    } else {
        await interaction.reply(data).catch(() => null);
    }

    setTimeout(async () => {
        await interaction.deleteReply().catch(() => null);
    }, EPHEMERAL_DELETE_DELAY);
}

async function sendTicketFeedbackDM(client, ticketData) {
    try {
        const user = await client.users.fetch(ticketData.ownerId).catch(() => null);
        if (!user) return false;

        const embed = new EmbedBuilder()
            .setColor('#3BA55D')
            .setTitle('💬 Atendimento finalizado')
            .setDescription(
                'Obrigado por fazer parte da comunidade.\n\n' +
                'Seu ticket foi encerrado e queremos saber como foi sua experiência no atendimento.'
            )
            .addFields({
                name: '⭐ Sua avaliação é importante',
                value: 'Escolha abaixo uma nota de **1 a 5 estrelas** para registrar seu feedback.',
                inline: false
            })
            .setFooter({
                text: 'Equipe de atendimento • Avaliação de suporte'
            })
            .setTimestamp();

        await user.send({
            embeds: [embed],
            components: [buildFeedbackButtons(ticketData.channelId)]
        });

        return true;
    } catch (error) {
        console.error('Erro ao enviar DM de feedback do ticket:', error);
        return false;
    }
}

function sanitizeChannelName(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 90) || 'call';
}

module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        try {
            // ==================================================
            // 🎙️ PAINEL DE CRIAR CALL
            // ==================================================
            if (interaction.isButton() && interaction.customId === CALL_CREATE_BUTTON_ID) {
                if (!interaction.guild) {
                    return replyTemp(interaction, {
                        content: '❌ Esta interação só pode ser usada em servidor.'
                    });
                }

                if (interaction.channelId !== CALL_PANEL_CHANNEL_ID) {
                    return replyTemp(interaction, {
                        content: '❌ Este botão só pode ser usado no painel oficial de calls.'
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId(CALL_CREATE_MODAL_ID)
                    .setTitle('Criar sua call');

                const nameInput = new TextInputBuilder()
                    .setCustomId('call_name')
                    .setLabel('Nome da call')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Resenha, Duozin, Sala do Kauã')
                    .setRequired(true)
                    .setMaxLength(40);

                const limitInput = new TextInputBuilder()
                    .setCustomId('call_limit')
                    .setLabel('Quantidade de membros')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 2, 5, 10, 20')
                    .setRequired(true)
                    .setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(limitInput)
                );

                return interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === CALL_CREATE_MODAL_ID) {
                if (!interaction.guild) {
                    return replyTemp(interaction, {
                        content: '❌ Esta interação só pode ser usada em servidor.'
                    });
                }

                const callNameRaw = interaction.fields.getTextInputValue('call_name');
                const callLimitRaw = interaction.fields.getTextInputValue('call_limit');

                const callName = callNameRaw.trim();
                const userLimit = Number(callLimitRaw);

                if (!callName) {
                    return replyTemp(interaction, {
                        content: '❌ Você precisa informar um nome para a call.'
                    });
                }

                if (!Number.isInteger(userLimit) || userLimit < 1 || userLimit > 99) {
                    return replyTemp(interaction, {
                        content: '❌ A quantidade de membros deve ser um número entre 1 e 99.'
                    });
                }

                const category = interaction.guild.channels.cache.get(CALL_CATEGORY_ID);

                if (!category || category.type !== ChannelType.GuildCategory) {
                    return replyTemp(interaction, {
                        content: '❌ A categoria configurada para criar calls não foi encontrada.'
                    });
                }

                const safeCallName = sanitizeChannelName(callName);

                const createdChannel = await interaction.guild.channels.create({
                    name: safeCallName,
                    type: ChannelType.GuildVoice,
                    parent: CALL_CATEGORY_ID,
                    userLimit,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.Connect,
                                PermissionsBitField.Flags.Speak
                            ]
                        }
                    ]
                });

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('✅ Call criada com sucesso')
                    .setDescription(`Sua call foi criada em ${createdChannel}`)
                    .addFields(
                        {
                            name: 'Nome',
                            value: callName,
                            inline: true
                        },
                        {
                            name: 'Limite de membros',
                            value: String(userLimit),
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'Sistema de calls'
                    })
                    .setTimestamp();

                return replyTemp(interaction, {
                    embeds: [embed]
                });
            }

            // ==================================================
            // 🚀 CRIAR POSTAGEM PELO BOTÃO
            // ==================================================
            if (interaction.isButton()) {
                const createPostCustomIds = [
                    'criar_postagem',
                    'criar_post',
                    'postar',
                    'postar_criar',
                    'abrir_postagem'
                ];

                if (createPostCustomIds.includes(interaction.customId)) {
                    if (!interaction.guild) {
                        return replyTemp(interaction, {
                            content: '❌ Esta interação só pode ser usada em servidor.'
                        });
                    }

                    createPostSession(
                        interaction.user.id,
                        interaction.guild.id,
                        interaction.channel.id
                    );

                    try {
                        const embedDM = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setTitle('🚀 Criação de Postagem')
                            .setDescription(
                                [
                                    'Vamos criar sua postagem.',
                                    '',
                                    '📝 Envie agora o **título** da sua postagem no privado.',
                                    '',
                                    'Para cancelar o processo a qualquer momento, envie **cancelar**.'
                                ].join('\n')
                            )
                            .setFooter({ text: 'Sistema de Postagens' })
                            .setTimestamp();

                        await interaction.user.send({ embeds: [embedDM] });

                        return replyTemp(interaction, {
                            content: '✅ Te enviei uma DM para criar sua postagem.'
                        });
                    } catch (error) {
                        console.error('Erro ao enviar DM para criação de postagem:', error);

                        return replyTemp(interaction, {
                            content: '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.'
                        });
                    }
                }
            }

            // ==================================================
            // 🎫 CRIAR TICKET
            // ==================================================
            if (interaction.isButton()) {
                if (
                    interaction.customId === 'abrir_ticket_suporte' ||
                    interaction.customId === 'abrir_ticket_parceria'
                ) {
                    if (!interaction.guild) {
                        return replyTemp(interaction, {
                            content: '❌ Esta interação só pode ser usada em servidor.'
                        });
                    }

                    const ticketType =
                        interaction.customId === 'abrir_ticket_suporte'
                            ? 'suporte'
                            : 'parceria';

                    const category = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);

                    if (!category || category.type !== ChannelType.GuildCategory) {
                        return replyTemp(interaction, {
                            content: '❌ A categoria configurada para os tickets não foi encontrada.'
                        });
                    }

                    const existingChannel = interaction.guild.channels.cache.find(channel => {
                        if (channel.type !== ChannelType.GuildText) return false;
                        if (channel.parentId !== TICKET_CATEGORY_ID) return false;

                        const ticketData = getTicketByChannelId(channel.id);
                        return (
                            ticketData &&
                            ticketData.ownerId === interaction.user.id &&
                            ticketData.status === 'open' &&
                            ticketData.type === ticketType
                        );
                    });

                    if (existingChannel) {
                        return replyTemp(interaction, {
                            content: `❌ Você já possui um ticket de **${ticketType}** aberto em ${existingChannel}.`
                        });
                    }

                    const safeUserName = interaction.user.username
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9-_]/g, '')
                        .slice(0, 12) || 'usuario';

                    const channelName = `ticket-${ticketType}-${safeUserName}`;

                    const channel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: TICKET_CATEGORY_ID,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionsBitField.Flags.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
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

                    setTicketByChannelId(channel.id, {
                        channelId: channel.id,
                        guildId: interaction.guild.id,
                        ownerId: interaction.user.id,
                        ownerTag: interaction.user.tag,
                        type: ticketType,
                        status: 'open',
                        assumedBy: null,
                        closedBy: null,
                        rating: null,
                        createdAt: Date.now()
                    });

                    const controlsRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('assumir_ticket')
                            .setLabel('Assumir Ticket')
                            .setEmoji('🧑‍💼')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('fechar_ticket')
                            .setLabel('Fechar Ticket')
                            .setEmoji('🔒')
                            .setStyle(ButtonStyle.Danger)
                    );

                    const embed = new EmbedBuilder()
                        .setColor(ticketType === 'suporte' ? '#5865F2' : '#57F287')
                        .setTitle(
                            ticketType === 'suporte'
                                ? '🛠️ Ticket de Suporte Aberto'
                                : '🤝 Ticket de Parceria Aberto'
                        )
                        .setDescription(
                            `Olá ${interaction.user}, seu ticket foi criado com sucesso.\n\n` +
                            'Aguarde um membro da equipe assumir o atendimento.'
                        )
                        .addFields({
                            name: '📌 Importante',
                            value: 'Explique sua solicitação com clareza para agilizar o atendimento.',
                            inline: false
                        })
                        .setFooter({
                            text: `${interaction.guild.name} • Sistema de tickets`
                        })
                        .setTimestamp();

                    await channel.send({
                        content: `${interaction.user}`,
                        embeds: [embed],
                        components: [controlsRow]
                    });

                    return replyTemp(interaction, {
                        content: `✅ Seu ticket foi criado com sucesso em ${channel}`
                    });
                }
            }

            // ==================================================
            // 👨‍💼 ASSUMIR TICKET
            // ==================================================
            if (interaction.isButton() && interaction.customId === 'assumir_ticket') {
                if (!interaction.guild || !interaction.channel) {
                    return replyTemp(interaction, {
                        content: '❌ Esta ação só pode ser usada dentro de um ticket.'
                    });
                }

                if (!memberHasStaffRole(interaction.member)) {
                    return replyTemp(interaction, {
                        content: '❌ Apenas cargos definidos em `!setadm` podem assumir tickets.'
                    });
                }

                const ticketData = getTicketByChannelId(interaction.channel.id);

                if (!ticketData || ticketData.status !== 'open') {
                    return replyTemp(interaction, {
                        content: '❌ Este canal não está registrado como um ticket aberto.'
                    });
                }

                if (ticketData.assumedBy && ticketData.assumedBy !== interaction.user.id) {
                    return replyTemp(interaction, {
                        content: `❌ Este ticket já foi assumido por <@${ticketData.assumedBy}>.`
                    });
                }

                if (ticketData.assumedBy === interaction.user.id) {
                    return replyTemp(interaction, {
                        content: '❌ Você já assumiu este ticket.'
                    });
                }

                setTicketByChannelId(interaction.channel.id, {
                    assumedBy: interaction.user.id,
                    assumedAt: Date.now()
                });

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🟢 Atendimento iniciado')
                    .setDescription(
                        `Olá! ${interaction.user} está pronto para atendê-lo.\n\n` +
                        'Pode ficar tranquilo, seu atendimento será realizado com atenção e profissionalismo.\n' +
                        'Explique em detalhes como podemos ajudá-lo.'
                    )
                    .addFields({
                        name: '✅ Atendimento em andamento',
                        value: 'Nossa equipe já está acompanhando este ticket.',
                        inline: false
                    })
                    .setFooter({
                        text: 'Equipe de suporte • Atendimento oficial'
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ==================================================
            // 🔒 FECHAR TICKET
            // ==================================================
            if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
                if (!interaction.guild || !interaction.channel) {
                    return replyTemp(interaction, {
                        content: '❌ Esta ação só pode ser usada dentro de um ticket.'
                    });
                }

                const ticketData = getTicketByChannelId(interaction.channel.id);

                if (!ticketData || ticketData.status !== 'open') {
                    return replyTemp(interaction, {
                        content: '❌ Este canal não está registrado como um ticket aberto.'
                    });
                }

                const isOwner = interaction.user.id === ticketData.ownerId;
                const isStaff = memberHasStaffRole(interaction.member);

                if (!isOwner && !isStaff) {
                    return replyTemp(interaction, {
                        content: '❌ Apenas o cliente do ticket ou cargos definidos em `!setadm` podem fechá-lo.'
                    });
                }

                setTicketByChannelId(interaction.channel.id, {
                    status: 'closed',
                    closedBy: interaction.user.id,
                    closedAt: Date.now()
                });

                const feedbackSent = await sendTicketFeedbackDM(interaction.client, {
                    ...ticketData,
                    channelId: interaction.channel.id
                });

                const closingEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🔒 Ticket encerrado')
                    .setDescription(
                        'Este atendimento foi finalizado.\n\n' +
                        (feedbackSent
                            ? 'Enviamos uma mensagem no privado do cliente para avaliação do atendimento.'
                            : 'Não foi possível enviar a mensagem de avaliação no privado do cliente.')
                    )
                    .addFields(
                        {
                            name: 'Encerrado por',
                            value: `${interaction.user}`,
                            inline: true
                        },
                        {
                            name: 'Feedback',
                            value: feedbackSent ? 'Enviado no privado' : 'Não enviado',
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'O canal será apagado em 5 segundos'
                    })
                    .setTimestamp();

                await interaction.reply({
                    embeds: [closingEmbed]
                });

                setTimeout(async () => {
                    await interaction.channel.delete().catch(() => null);
                }, 5000);

                return;
            }

            // ==================================================
            // ⭐ FEEDBACK DO TICKET
            // ==================================================
            if (interaction.isButton() && interaction.customId.startsWith('ticket_feedback:')) {
                const [, ticketChannelId, starsRaw] = interaction.customId.split(':');
                const stars = Number(starsRaw);

                if (!ticketChannelId || !stars || stars < 1 || stars > 5) {
                    return interaction.reply({
                        content: '❌ Feedback inválido.',
                        ephemeral: true
                    }).catch(() => null);
                }

                const ticketData = getTicketByChannelId(ticketChannelId);

                if (!ticketData) {
                    return interaction.reply({
                        content: '❌ Não foi possível localizar os dados deste atendimento.',
                        ephemeral: true
                    }).catch(() => null);
                }

                if (interaction.user.id !== ticketData.ownerId) {
                    return interaction.reply({
                        content: '❌ Apenas o cliente deste ticket pode enviar a avaliação.',
                        ephemeral: true
                    }).catch(() => null);
                }

                if (ticketData.rating) {
                    return interaction.reply({
                        content: '❌ Este ticket já foi avaliado.',
                        ephemeral: true
                    }).catch(() => null);
                }

                setTicketByChannelId(ticketChannelId, {
                    rating: stars,
                    ratedAt: Date.now()
                });

                const feedbackChannel = await interaction.client.channels.fetch(FEEDBACK_CHANNEL_ID).catch(() => null);

                if (feedbackChannel && feedbackChannel.type === ChannelType.GuildText) {
                    const starsText = '⭐'.repeat(stars);

                    const embed = new EmbedBuilder()
                        .setColor('#F1C40F')
                        .setTitle('⭐ Nova avaliação de atendimento')
                        .addFields(
                            {
                                name: 'Cliente',
                                value: `<@${ticketData.ownerId}>`,
                                inline: true
                            },
                            {
                                name: 'Staff',
                                value: ticketData.assumedBy ? `<@${ticketData.assumedBy}>` : 'Não informado',
                                inline: true
                            },
                            {
                                name: 'Nota',
                                value: `${starsText} (${stars}/5)`,
                                inline: false
                            }
                        )
                        .setFooter({
                            text: 'Sistema de feedback de tickets'
                        })
                        .setTimestamp();

                    await feedbackChannel.send({
                        embeds: [embed]
                    }).catch(() => null);
                }

                const currentRows = interaction.message.components || [];
                const disabledRows = currentRows.map(row => disableFeedbackButtons(row));

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Avaliação registrada')
                    .setDescription(
                        `Recebemos sua avaliação de **${'⭐'.repeat(stars)} (${stars}/5)**.\n\n` +
                        'Obrigado pelo seu feedback. Ele é muito importante para melhorarmos cada vez mais o atendimento.'
                    )
                    .setFooter({
                        text: 'Feedback enviado com sucesso'
                    })
                    .setTimestamp();

                return interaction.update({
                    embeds: [confirmEmbed],
                    components: disabledRows
                });
            }

            // ==================================================
            // ✅ APROVAÇÃO / ❌ RECUSA DE POSTS
            // ==================================================
            if (interaction.isButton()) {
                if (
                    interaction.customId.startsWith('approve_post:') ||
                    interaction.customId.startsWith('reject_post:')
                ) {
                    if (!interaction.guild) {
                        return replyTemp(interaction, {
                            content: '❌ Esta interação só pode ser usada em servidor.'
                        });
                    }

                    if (!memberHasStaffRole(interaction.member)) {
                        return replyTemp(interaction, {
                            content: '❌ Apenas cargos definidos em `!setadm` podem aprovar ou recusar postagens.'
                        });
                    }

                    const [action, postId] = interaction.customId.split(':');
                    const publishChannelId = process.env.POST_CHANNEL_ID;

                    if (!publishChannelId) {
                        return replyTemp(interaction, {
                            content: '❌ O canal final de postagens não está configurado no .env.'
                        });
                    }

                    if (action === 'approve_post') {
                        const post = await approvePost(interaction, postId, publishChannelId);

                        const embed = new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('✅ Postagem aprovada')
                            .setDescription(`A postagem **${post.title || 'Sem título'}** foi aprovada e publicada.`)
                            .setFooter({ text: `Aprovada por ${interaction.user.username}` })
                            .setTimestamp();

                        return interaction.update({
                            embeds: [embed],
                            components: []
                        });
                    }

                    if (action === 'reject_post') {
                        const post = await rejectPost(interaction, postId);

                        const embed = new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('❌ Postagem recusada')
                            .setDescription(`A postagem **${post.title || 'Sem título'}** foi recusada.`)
                            .setFooter({ text: `Recusada por ${interaction.user.username}` })
                            .setTimestamp();

                        return interaction.update({
                            embeds: [embed],
                            components: []
                        });
                    }
                }
            }

            // ==================================================
            // ❤️ INTERAÇÕES DAS POSTAGENS PUBLICADAS
            // ==================================================
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('post_like:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return replyTemp(interaction, {
                            content: '❌ Esta postagem não está registrada no sistema.'
                        });
                    }

                    const result = toggleLike(messageId, interaction.user);
                    await refreshPostButtons(interaction.message);

                    const embed = new EmbedBuilder()
                        .setColor(result.liked ? '#57F287' : '#FEE75C')
                        .setTitle(result.liked ? '💚 Curtida adicionada' : '💔 Curtida removida')
                        .setDescription(
                            result.liked
                                ? 'Sua curtida foi adicionada com sucesso.'
                                : 'Sua curtida foi removida com sucesso.'
                        )
                        .addFields({
                            name: 'Total de curtidas',
                            value: String(result.likesCount),
                            inline: true
                        })
                        .setTimestamp();

                    return replyTemp(interaction, {
                        embeds: [embed]
                    });
                }

                if (interaction.customId.startsWith('post_comment:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return replyTemp(interaction, {
                            content: '❌ Esta postagem não está registrada no sistema.'
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`post_comment_modal:${messageId}`)
                        .setTitle('💬 Comentar na postagem');

                    const commentInput = new TextInputBuilder()
                        .setCustomId('post_comment_text')
                        .setLabel('Escreva seu comentário')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Digite aqui o seu comentário...')
                        .setRequired(true)
                        .setMaxLength(1000);

                    const row = new ActionRowBuilder().addComponents(commentInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('post_view_comments:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return replyTemp(interaction, {
                            content: '❌ Esta postagem não está registrada no sistema.'
                        });
                    }

                    const embed = buildCommentsEmbed(messageId);

                    return replyTemp(interaction, {
                        embeds: [embed]
                    });
                }
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('post_comment_modal:')) {
                    const messageId = interaction.customId.split(':')[1];
                    const post = getPostRecord(messageId);

                    if (!post) {
                        return replyTemp(interaction, {
                            content: '❌ Esta postagem não está registrada no sistema.'
                        });
                    }

                    const commentText = interaction.fields.getTextInputValue('post_comment_text');
                    const result = addComment(messageId, interaction.user, commentText);

                    if (!result) {
                        return replyTemp(interaction, {
                            content: '❌ Não foi possível adicionar o comentário.'
                        });
                    }

                    const channel = await interaction.client.channels.fetch(post.channelId).catch(() => null);

                    if (channel) {
                        const targetMessage = await channel.messages.fetch(messageId).catch(() => null);

                        if (targetMessage) {
                            await refreshPostButtons(targetMessage);
                        }
                    }

                    if (post.authorId && post.authorId !== interaction.user.id) {
                        const authorUser = await interaction.client.users.fetch(post.authorId).catch(() => null);

                        if (authorUser) {
                            const notificationEmbed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle('🔔 Novo comentário na sua postagem')
                                .setDescription(`**${interaction.user.username}** comentou na sua postagem.`)
                                .addFields(
                                    {
                                        name: 'Comentário',
                                        value: result.comment.content.length > 1024
                                            ? `${result.comment.content.slice(0, 1021)}...`
                                            : result.comment.content,
                                        inline: false
                                    },
                                    {
                                        name: 'Total de comentários',
                                        value: String(result.commentsCount),
                                        inline: true
                                    }
                                )
                                .setTimestamp();

                            await authorUser.send({ embeds: [notificationEmbed] }).catch(() => null);
                        }
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('✅ Comentário enviado')
                        .setDescription('Seu comentário foi adicionado com sucesso.')
                        .addFields({
                            name: 'Total de comentários',
                            value: String(result.commentsCount),
                            inline: true
                        })
                        .setTimestamp();

                    return replyTemp(interaction, {
                        embeds: [embed]
                    });
                }
            }
        } catch (error) {
            console.error('Erro no interactionCreate:', error);

            if ((interaction.isButton() || interaction.isModalSubmit()) && !interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: '❌ Ocorreu um erro ao processar esta interação.',
                    ephemeral: true
                }).catch(() => null);
            }
        }
    }
};
