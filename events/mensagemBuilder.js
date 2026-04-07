const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const {
    getSessions,
    saveSessions,
    aplicarTemplate,
    buildPreviewEmbed,
    buildEditorRows,
    isValidHexColor,
    normalizeHexColor,
    isValidUrl
} = require('../utils/messageBuilder');

async function atualizarEditor(interaction, sessao) {
    try {
        const msg = await interaction.channel.messages.fetch(sessao.editorMessageId).catch(() => null);
        if (!msg) return;

        const header = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🧩 Editor de Mensagens Premium')
            .setDescription(
                'Escolha um template e edite sua mensagem usando os botões abaixo.\n\n' +
                'Você pode definir:\n' +
                '• título\n' +
                '• texto\n' +
                '• cor\n' +
                '• foto principal\n' +
                '• foto no canto direito superior\n' +
                '• ícone do aviso\n' +
                '• rodapé\n\n' +
                'Quando terminar, clique em **Publicar**.'
            )
            .setFooter({ text: 'Editor de templates • via DM' })
            .setTimestamp();

        const preview = buildPreviewEmbed(sessao, interaction.user);
        const rows = buildEditorRows(sessao);

        await msg.edit({
            embeds: [header, preview],
            components: rows
        }).catch(() => {});
    } catch (error) {
        console.error('Erro ao atualizar editor:', error);
    }
}

function criarModal(customId, title, label, value = '', required = false, placeholder = '') {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const input = new TextInputBuilder()
        .setCustomId('value')
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(required)
        .setPlaceholder(placeholder);

    const safeValue = String(value || '').trim();
    if (safeValue.length > 0) {
        input.setValue(safeValue.slice(0, 4000));
    }

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    return modal;
}

async function responderTemporario(interaction, content, ms = 5000) {
    try {
        if (interaction.replied || interaction.deferred) {
            const msg = await interaction.followUp({
                content,
                fetchReply: true
            }).catch(() => null);

            if (msg) {
                setTimeout(() => {
                    interaction.channel?.messages?.delete?.(msg.id).catch?.(() => {});
                }, ms);
            }
            return;
        }

        const msg = await interaction.reply({
            content,
            fetchReply: true
        }).catch(() => null);

        if (msg) {
            setTimeout(() => {
                interaction.channel?.messages?.delete?.(msg.id).catch?.(() => {});
            }, ms);
        }
    } catch (error) {
        console.error('Erro ao responder temporariamente:', error);
    }
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            const sessions = getSessions();
            const sessao = sessions[interaction.user.id];

            const builderButtonIds = [
                'mensagem_edit_titulo',
                'mensagem_edit_texto',
                'mensagem_edit_cor',
                'mensagem_edit_footer',
                'mensagem_edit_icone',
                'mensagem_edit_imagem',
                'mensagem_edit_thumb',
                'mensagem_publicar',
                'mensagem_cancelar'
            ];

            const isBuilderSelect =
                interaction.isStringSelectMenu() &&
                interaction.customId === 'mensagem_select_template';

            const isBuilderButton =
                interaction.isButton() &&
                builderButtonIds.includes(interaction.customId);

            const isBuilderModal =
                interaction.isModalSubmit() &&
                interaction.customId.startsWith('mensagem_modal_');

            if (!isBuilderSelect && !isBuilderButton && !isBuilderModal) return;

            if (!sessao) {
                await responderTemporario(
                    interaction,
                    '❌ Sua sessão do editor expirou. Use `!mensagem` novamente.',
                    6000
                );
                return;
            }

            // =========================
            // SELECT DE TEMPLATE
            // =========================
            if (isBuilderSelect) {
                const selected = interaction.values[0];

                aplicarTemplate(sessao, selected);
                sessions[interaction.user.id] = sessao;
                saveSessions(sessions);

                await interaction.deferUpdate();
                await atualizarEditor(interaction, sessao);
                return;
            }

            // =========================
            // BOTÕES
            // =========================
            if (isBuilderButton) {
                if (interaction.customId === 'mensagem_edit_titulo') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_titulo',
                            'Editar título',
                            'Digite o título',
                            sessao.title,
                            true,
                            'Ex: 🚨 Aviso importante'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_texto') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_texto',
                            'Editar texto',
                            'Digite o conteúdo da mensagem',
                            sessao.description,
                            true,
                            'Escreva aqui o conteúdo principal'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_cor') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_cor',
                            'Editar cor',
                            'Digite uma cor HEX',
                            sessao.color,
                            true,
                            'Ex: #5865F2'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_footer') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_footer',
                            'Editar rodapé',
                            'Digite o rodapé',
                            sessao.footer,
                            false,
                            'Ex: Aviso oficial'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_icone') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_icone',
                            'Editar ícone do aviso',
                            'Cole a URL da imagem',
                            sessao.iconUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_imagem') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_imagem',
                            'Editar foto principal',
                            'Cole a URL da imagem',
                            sessao.imageUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_edit_thumb') {
                    await interaction.showModal(
                        criarModal(
                            'mensagem_modal_thumb',
                            'Editar foto do canto direito',
                            'Cole a URL da imagem',
                            sessao.thumbnailUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                    return;
                }

                if (interaction.customId === 'mensagem_publicar') {
                    const guild = await interaction.client.guilds.fetch(sessao.guildId).catch(() => null);
                    if (!guild) {
                        await responderTemporario(interaction, '❌ Não encontrei o servidor de destino.');
                        return;
                    }

                    const channel = await guild.channels.fetch(sessao.targetChannelId).catch(() => null);
                    if (!channel || !channel.isTextBased()) {
                        await responderTemporario(interaction, '❌ Não encontrei o canal de destino.');
                        return;
                    }

                    const embed = buildPreviewEmbed(sessao, interaction.user);
                    await channel.send({ embeds: [embed] });

                    await responderTemporario(interaction, '✅ Mensagem publicada com sucesso no canal.', 8000);

                    delete sessions[interaction.user.id];
                    saveSessions(sessions);

                    const msg = await interaction.channel.messages.fetch(sessao.editorMessageId).catch(() => null);
                    if (msg) {
                        await msg.edit({
                            content: '✅ Mensagem publicada com sucesso.',
                            embeds: [],
                            components: []
                        }).catch(() => {});
                    }

                    return;
                }

                if (interaction.customId === 'mensagem_cancelar') {
                    delete sessions[interaction.user.id];
                    saveSessions(sessions);

                    await responderTemporario(interaction, '❌ Editor cancelado.', 5000);

                    const msg = await interaction.channel.messages.fetch(sessao.editorMessageId).catch(() => null);
                    if (msg) {
                        await msg.edit({
                            content: '❌ Editor cancelado.',
                            embeds: [],
                            components: []
                        }).catch(() => {});
                    }

                    return;
                }
            }

            // =========================
            // MODAIS
            // =========================
            if (isBuilderModal) {
                const value = interaction.fields.getTextInputValue('value').trim();

                if (interaction.customId === 'mensagem_modal_titulo') {
                    sessao.title = value;
                }

                if (interaction.customId === 'mensagem_modal_texto') {
                    sessao.description = value;
                }

                if (interaction.customId === 'mensagem_modal_cor') {
                    if (!isValidHexColor(value)) {
                        await responderTemporario(
                            interaction,
                            '❌ Cor inválida. Use formato HEX, por exemplo: `#5865F2`.',
                            7000
                        );
                        return;
                    }

                    sessao.color = normalizeHexColor(value);
                }

                if (interaction.customId === 'mensagem_modal_footer') {
                    sessao.footer = value || 'Sem rodapé';
                }

                if (interaction.customId === 'mensagem_modal_icone') {
                    if (value && !isValidUrl(value)) {
                        await responderTemporario(interaction, '❌ URL inválida para o ícone.', 7000);
                        return;
                    }

                    sessao.iconUrl = value;
                }

                if (interaction.customId === 'mensagem_modal_imagem') {
                    if (value && !isValidUrl(value)) {
                        await responderTemporario(interaction, '❌ URL inválida para a foto principal.', 7000);
                        return;
                    }

                    sessao.imageUrl = value;
                }

                if (interaction.customId === 'mensagem_modal_thumb') {
                    if (value && !isValidUrl(value)) {
                        await responderTemporario(interaction, '❌ URL inválida para a foto do canto direito.', 7000);
                        return;
                    }

                    sessao.thumbnailUrl = value;
                }

                sessions[interaction.user.id] = sessao;
                saveSessions(sessions);

                await responderTemporario(interaction, '✅ Template atualizado.', 4000);
                await atualizarEditor(interaction, sessao);
                return;
            }
        } catch (error) {
            console.error('Erro no editor de mensagem:', error);

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar o editor de mensagens.'
                }).catch(() => {});
            }
        }
    }
};
