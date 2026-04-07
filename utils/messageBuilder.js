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
    premium_announcement: {
        label: '🚀 Anúncio Premium',
        color: '#5865F2',
        title: 'Grande anúncio para a comunidade',
        subtitle: 'Confira as novidades e informações mais importantes abaixo.',
        description:
            'Este espaço é ideal para apresentar uma atualização importante, lançamento, comunicado ou convite para os membros.',
        highlightTitle: '✨ Destaque',
        highlightText: 'Use este bloco para chamar atenção para a informação principal.',
        cta: 'Fique atento às próximas novidades.',
        footer: 'Comunicado oficial',
        authorName: 'Equipe oficial'
    },
    elegant_warning: {
        label: '📢 Aviso Elegante',
        color: '#F1C40F',
        title: 'Aviso importante',
        subtitle: 'Leia com atenção as informações abaixo.',
        description:
            'Utilize este modelo para avisos organizados, informativos e com visual limpo.',
        highlightTitle: '📌 Importante',
        highlightText: 'Adicione aqui o ponto principal do aviso.',
        cta: 'Em caso de dúvidas, fale com a equipe.',
        footer: 'Sistema de avisos',
        authorName: 'Central de avisos'
    },
    urgent_alert: {
        label: '🚨 Alerta Urgente',
        color: '#ED4245',
        title: 'Atenção imediata',
        subtitle: 'Este comunicado exige atenção dos membros.',
        description:
            'Use este template para alertas urgentes, mudanças repentinas ou comunicados críticos.',
        highlightTitle: '⚠️ Alerta',
        highlightText: 'Informe aqui o motivo da urgência.',
        cta: 'Acompanhe este canal para novas atualizações.',
        footer: 'Comunicado urgente',
        authorName: 'Alerta do servidor'
    },
    event_card: {
        label: '🎉 Evento Premium',
        color: '#57F287',
        title: 'Evento especial',
        subtitle: 'Participe e aproveite esta ocasião com a comunidade.',
        description:
            'Este template é ideal para anunciar eventos, encontros, desafios, sorteios ou atividades especiais.',
        highlightTitle: '📅 Detalhes',
        highlightText: 'Informe aqui data, horário e regras principais.',
        cta: 'Não perca essa oportunidade.',
        footer: 'Evento da comunidade',
        authorName: 'Organização do evento'
    },
    partnership_card: {
        label: '🤝 Parceria Oficial',
        color: '#9B59B6',
        title: 'Nova parceria confirmada',
        subtitle: 'Estamos felizes em compartilhar esta novidade.',
        description:
            'Use este layout para parcerias, colaborações, divulgações e anúncios conjuntos.',
        highlightTitle: '🌟 Benefícios',
        highlightText: 'Explique aqui o que essa parceria traz para a comunidade.',
        cta: 'Acompanhe para mais novidades exclusivas.',
        footer: 'Parceria oficial',
        authorName: 'Relações e parcerias'
    },
    update_patch: {
        label: '🛠️ Atualização / Patch',
        color: '#3498DB',
        title: 'Nova atualização disponível',
        subtitle: 'Veja abaixo tudo o que mudou.',
        description:
            'Ideal para changelogs, melhorias, correções, novidades e ajustes no servidor ou sistema.',
        highlightTitle: '📦 Resumo da atualização',
        highlightText: 'Liste aqui as mudanças mais importantes.',
        cta: 'Continue acompanhando as próximas atualizações.',
        footer: 'Atualização oficial',
        authorName: 'Sistema / Desenvolvimento'
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
    const base = TEMPLATES.premium_announcement;

    return {
        ownerId: userId,
        guildId,
        targetChannelId: channelId,
        editorMessageId: null,
        template: 'premium_announcement',
        color: base.color,
        title: base.title,
        subtitle: base.subtitle,
        description: base.description,
        highlightTitle: base.highlightTitle,
        highlightText: base.highlightText,
        cta: base.cta,
        footer: base.footer,
        authorName: base.authorName,
        imageUrl: '',
        thumbnailUrl: '',
        iconUrl: '',
        mentionContent: ''
    };
}

function aplicarTemplate(sessao, templateKey) {
    const template = TEMPLATES[templateKey];
    if (!template) return sessao;

    sessao.template = templateKey;
    sessao.color = template.color;
    sessao.title = template.title;
    sessao.subtitle = template.subtitle;
    sessao.description = template.description;
    sessao.highlightTitle = template.highlightTitle;
    sessao.highlightText = template.highlightText;
    sessao.cta = template.cta;
    sessao.footer = template.footer;
    sessao.authorName = template.authorName;

    return sessao;
}

function buildPreviewEmbed(sessao, user) {
    const template = TEMPLATES[sessao.template] || TEMPLATES.premium_announcement;

    const embed = new EmbedBuilder()
        .setColor(sessao.color || template.color)
        .setTitle(`╭・${sessao.title || template.title}`)
        .setDescription(
            `> ${sessao.subtitle || template.subtitle}\n\n` +
            `${sessao.description || template.description}`
        )
        .setFooter({
            text: sessao.footer || template.footer,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    embed.setAuthor({
        name: sessao.authorName || template.authorName,
        iconURL: sessao.iconUrl || user.displayAvatarURL({ dynamic: true })
    });

    embed.addFields(
        {
            name: sessao.highlightTitle || template.highlightTitle,
            value: sessao.highlightText || template.highlightText,
            inline: false
        },
        {
            name: '📣 Chamada final',
            value: sessao.cta || template.cta,
            inline: false
        }
    );

    if (sessao.imageUrl) embed.setImage(sessao.imageUrl);
    if (sessao.thumbnailUrl) embed.setThumbnail(sessao.thumbnailUrl);

    return embed;
}

function buildEditorRows(sessao) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('mensagem_select_template')
        .setPlaceholder('Escolha um template premium')
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
            .setCustomId('mensagem_edit_subtitulo')
            .setLabel('Subtítulo')
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
            .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mensagem_edit_highlight')
            .setLabel('Destaque')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_cta')
            .setLabel('Chamada final')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_imagem')
            .setLabel('Banner')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_thumb')
            .setLabel('Thumbnail')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_edit_icone')
            .setLabel('Ícone')
            .setStyle(ButtonStyle.Secondary)
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mensagem_publicar')
            .setLabel('Publicar')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('mensagem_cancelar')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2, row3, row4];
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
