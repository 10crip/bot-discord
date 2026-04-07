const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const sessionsPath = path.join(__dirname, '../message_builder_sessions.json');

const TEMPLATES = {
    aviso: {
        label: '📢 Aviso elegante',
        color: '#5865F2',
        title: '📢 Aviso importante',
        description: 'Escreva aqui a mensagem principal do seu aviso.',
        footer: 'Sistema de avisos'
    },
    anuncio: {
        label: '🚀 Anúncio premium',
        color: '#57F287',
        title: '🚀 Novo anúncio',
        description: 'Compartilhe aqui sua novidade com o servidor.',
        footer: 'Anúncio oficial'
    },
    evento: {
        label: '🎉 Evento especial',
        color: '#F1C40F',
        title: '🎉 Evento especial',
        description: 'Descreva aqui seu evento, data, horário e informações importantes.',
        footer: 'Evento da comunidade'
    },
    urgente: {
        label: '🚨 Aviso urgente',
        color: '#ED4245',
        title: '🚨 Atenção',
        description: 'Escreva aqui um comunicado urgente para os membros.',
        footer: 'Comunicado urgente'
    },
    atualizacao: {
        label: '🛠️ Atualização',
        color: '#3498DB',
        title: '🛠️ Atualização do sistema',
        description: 'Informe aqui as mudanças, melhorias ou correções.',
        footer: 'Atualização oficial'
    },
    parceria: {
        label: '🤝 Parceria',
        color: '#9B59B6',
        title: '🤝 Nova parceria',
        description: 'Apresente aqui os detalhes da parceria.',
        footer: 'Parceria oficial'
    }
};

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

function getSessions() {
    return lerJson(sessionsPath);
}

function saveSessions(data) {
    salvarJson(sessionsPath, data);
}

function criarSessao(userId, guildId, channelId) {
    const base = TEMPLATES.aviso;

    return {
        ownerId: userId,
        guildId,
        targetChannelId: channelId,
        editorMessageId: null,
        template: 'aviso',
        color: base.color,
        title: base.title,
        description: base.description,
        footer: base.footer,
        imageUrl: '',
        thumbnailUrl: '',
        iconUrl: ''
    };
}

function aplicarTemplate(sessao, templateKey) {
    const template = TEMPLATES[templateKey];
    if (!template) return sessao;

    sessao.template = templateKey;
    sessao.color = template.color;
    sessao.title = template.title;
    sessao.description = template.description;
    sessao.footer = template.footer;

    return sessao;
}

function buildPreviewEmbed(sessao, user) {
    const template = TEMPLATES[sessao.template] || TEMPLATES.aviso;

    const embed = new EmbedBuilder()
        .setColor(sessao.color || template.color)
        .setTitle(sessao.title || template.title)
        .setDescription(sessao.description || template.description)
        .setFooter({ text: sessao.footer || template.footer })
        .setTimestamp();

    if (sessao.iconUrl) {
        embed.setAuthor({
            name: user.username,
            iconURL: sessao.iconUrl
        });
    } else {
        embed.setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ dynamic: true })
        });
    }

    if (sessao.imageUrl) embed.setImage(sessao.imageUrl);
    if (sessao.thumbnailUrl) embed.setThumbnail(sessao.thumbnailUrl);

    embed.addFields({
        name: '🎨 Template selecionado',
        value: template.label,
        inline: false
    });

    return embed;
}

function buildEditorRows(sessao) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('mensagem_select_template')
        .setPlaceholder('Escolha um template')
        .addOptions(
            Object.entries(TEMPLATES).map(([value, data]) => ({
                label: data.label,
                value,
                default: sessao.template === value
            }))
        );

    const row1 = new ActionRowBuilder().addComponents(select);

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mensagem_edit_titulo')
            .setLabel('Título')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_texto')
            .setLabel('Texto')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_cor')
            .setLabel('Cor')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_footer')
            .setLabel('Rodapé')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_icone')
            .setLabel('Ícone')
            .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mensagem_edit_imagem')
            .setLabel('Foto principal')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_thumb')
            .setLabel('Foto canto direito')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_publicar')
            .setLabel('Publicar')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_cancelar')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2, row3];
}

function isValidHexColor(color) {
    return /^#?[0-9A-Fa-f]{6}$/.test(String(color || '').trim());
}

function normalizeHexColor(color) {
    const value = String(color || '').trim();
    if (!value) return '';
    return value.startsWith('#') ? value : `#${value}`;
}

function isValidUrl(url) {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    sessionsPath,
    TEMPLATES,
    getSessions,
    saveSessions,
    criarSessao,
    aplicarTemplate,
    buildPreviewEmbed,
    buildEditorRows,
    isValidHexColor,
    normalizeHexColor,
    isValidUrl
};