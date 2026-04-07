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
    const msg = await interaction.channel.messages.fetch(sessao.editorMessageId).catch(() => null);
    if (!msg) return;

    const header = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🧩 Editor de Mensagens Premium')
        .setDescription(
            'Escolha um template e personalize sua mensagem.\n\n' +
            'Finalize clicando em **Publicar**.'
        )
        .setFooter({ text: 'Editor de templates • via DM' })
        .setTimestamp();

    const preview = buildPreviewEmbed(sessao, interaction.user);
    const rows = buildEditorRows(sessao);

    await msg.edit({
        embeds: [header, preview],
        components: rows
    }).catch(() => {});
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
        .setValue(String(value || '').slice(0, 4000))
        .setPlaceholder(placeholder);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            const sessions = getSessions();
            const sessao = sessions[interaction.user.id];

            const builderIds = [
                'mensagem_select_template',
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

            const isBuilderModal = interaction.isModalSubmit() &&
                interaction.customId.startsWith('mensagem_modal_');

            const isBuilderButton = interaction.isButton() &&
                builderIds.includes(interaction.customId);

            const isBuilderSelect = interaction.isStringSelectMenu() &&
                interaction.customId === 'mensagem_select_template';

            if (!isBuilderModal && !isBuilderButton && !isBuilderSelect) return;

            if (!sessao) {
                if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: '❌ Sua sessão do editor expirou. Use `!mensagem` novamente.',
                        ephemeral: true
                    }).catch(() => {});
                }
                return;
            }

            // SELECT DE TEMPLATE
            if (isBuilderSelect) {
                const selected = interaction.values[0];
                aplicarTemplate(sessao, selected);
                sessions[interaction.user.id] = sessao;
                saveSessions(sessions);

                await interaction.deferUpdate();
                await atualizarEditor(interaction, sessao);
                return;
            }

            // BOTÕES
            if (isBuilderButton) {
                if (interaction.customId === 'mensagem_edit_titulo') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_titulo',
                            'Editar título',
                            'Digite o título',
                            sessao.title,
                            true,
                            'Ex: 🚨 Aviso importante'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_texto') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_texto',
                            'Editar texto',
                            'Digite o conteúdo da mensagem',
                            sessao.description,
                            true,
                            'Escreva aqui o conteúdo principal'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_cor') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_cor',
                            'Editar cor',
                            'Digite uma cor HEX',
                            sessao.color,
                            true,
                            'Ex: #5865F2'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_footer') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_footer',
                            'Editar rodapé',
                            'Digite o rodapé',
                            sessao.footer,
                            false,
                            'Ex: Aviso oficial'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_icone') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_icone',
                            'Editar ícone do aviso',
                            'Cole a URL da imagem',
                            sessao.iconUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_imagem') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_imagem',
                            'Editar foto principal',
                            'Cole a URL da imagem',
                            sessao.imageUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_edit_thumb') {
                    return interaction.showModal(
                        criarModal(
                            'mensagem_modal_thumb',
                            'Editar foto do canto direito',
                            'Cole a URL da imagem',
                            sessao.thumbnailUrl,
                            false,
                            'Deixe vazio para remover'
                        )
                    );
                }

                if (interaction.customId === 'mensagem_publicar') {
                    const guild = await interaction.client.guilds.fetch(sessao.guildId).catch(() => null);
                    if (!guild) {
                        return interaction.reply({
                            content: '❌ Não encontrei o servidor de destino.',
                            ephemeral: true
                        });
                    }

                    const channel = await guild.channels.fetch(sessao.targetChannelId).catch(() => null);
                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({
                            content: '❌ Não encontrei o canal de destino.',
                            ephemeral: true
                        });
                    }

                    const embed = buildPreviewEmbed(sessao, interaction.user);

                    await channel.send({ embeds: [embed] });

                    const confirm = await interaction.reply({
                        content: '✅ Mensagem publicada com sucesso no canal.',
                        ephemeral: true,
                        fetchReply: true
                    });

                    setTimeout(() => {
                        interaction.webhook.deleteMessage(confirm.id).catch(() => {});
                    }, 15000);

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

                    await interaction.reply({
                        content: '❌ Editor cancelado.',
                        ephemeral: true
                    }).catch(() => {});

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

            // MODAIS
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
                        return interaction.reply({
                            content: '❌ Cor inválida. Use formato HEX, por exemplo: `#5865F2`.',
                            ephemeral: true
                        });
                    }

                    sessao.color = normalizeHexColor(value);
                }

                if (interaction.customId === 'mensagem_modal_footer') {
                    sessao.footer = value || 'Sem rodapé';
                }

                if (interaction.customId === 'mensagem_modal_icone') {
                    if (!isValidUrl(value)) {
                        return interaction.reply({
                            content: '❌ URL inválida para o ícone.',
                            ephemeral: true
                        });
                    }

                    sessao.iconUrl = value;
                }

                if (interaction.customId === 'mensagem_modal_imagem') {
                    if (!isValidUrl(value)) {
                        return interaction.reply({
                            content: '❌ URL inválida para a foto principal.',
                            ephemeral: true
                        });
                    }

                    sessao.imageUrl = value;
                }

                if (interaction.customId === 'mensagem_modal_thumb') {
                    if (!isValidUrl(value)) {
                        return interaction.reply({
                            content: '❌ URL inválida para a foto do canto direito.',
                            ephemeral: true
                        });
                    }

                    sessao.thumbnailUrl = value;
                }

                sessions[interaction.user.id] = sessao;
                saveSessions(sessions);

                await interaction.reply({
                    content: '✅ Template atualizado.',
                    ephemeral: true
                });

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 5000);

                await atualizarEditor(interaction, sessao);
                return;
            }
        } catch (error) {
            console.error('Erro no editor de mensagem:', error);

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar o editor de mensagens.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};