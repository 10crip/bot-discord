const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const TEMPLATE_META = {
  moderno: {
    emoji: "✨",
    label: "Moderno",
    description: "Visual equilibrado e bonito"
  },
  aviso: {
    emoji: "⚠️",
    label: "Aviso",
    description: "Perfeito para alertas"
  },
  premium: {
    emoji: "💎",
    label: "Premium",
    description: "Visual elegante e refinado"
  },
  evento: {
    emoji: "🎉",
    label: "Evento",
    description: "Para divulgação de eventos"
  },
  manutencao: {
    emoji: "🛠️",
    label: "Manutenção",
    description: "Para atualizações e pausas"
  }
};

function getTemplateDefaults(template) {
  const base = {
    template,
    titulo: "Nova Mensagem",
    subtitulo: "Subtítulo da mensagem",
    texto: "Escreva aqui o conteúdo da sua mensagem.",
    cor: "#5865F2",
    banner: null,
    thumbnail: null,
    footer: "Sistema de Mensagens 2.1",
    usarImagem: false
  };

  switch (template) {
    case "moderno":
      return {
        ...base,
        titulo: "Comunicado Oficial",
        subtitulo: "Atualização importante para todos",
        texto: "Confira abaixo todas as informações deste anúncio.",
        cor: "#5865F2",
        footer: "Template Moderno"
      };

    case "aviso":
      return {
        ...base,
        titulo: "Aviso Importante",
        subtitulo: "Leia com atenção",
        texto: "Este aviso contém informações importantes para todos os membros do servidor.",
        cor: "#ED4245",
        footer: "Template Aviso"
      };

    case "premium":
      return {
        ...base,
        titulo: "Anúncio Premium",
        subtitulo: "Uma apresentação mais elegante",
        texto: "Esse espaço foi preparado para uma mensagem mais refinada e impactante.",
        cor: "#F1C40F",
        footer: "Template Premium"
      };

    case "evento":
      return {
        ...base,
        titulo: "Grande Evento",
        subtitulo: "Prepare-se para participar",
        texto: "Em breve teremos um evento especial. Fique atento aos horários, regras e premiações.",
        cor: "#57F287",
        footer: "Template Evento"
      };

    case "manutencao":
      return {
        ...base,
        titulo: "Manutenção Programada",
        subtitulo: "Atualização do sistema em andamento",
        texto: "Nosso sistema ficará temporariamente indisponível durante o período de manutenção.",
        cor: "#FAA61A",
        footer: "Template Manutenção"
      };

    default:
      return base;
  }
}

function getTemplateMeta(template) {
  return TEMPLATE_META[template] || {
    emoji: "📢",
    label: "Mensagem",
    description: "Template padrão"
  };
}

function buildTemplateSelectionEmbed() {
  return new EmbedBuilder()
    .setTitle("🎨 Mensagem 2.1")
    .setColor("#5865F2")
    .setDescription(
      [
        "Escolha um template para começar.",
        "",
        "Depois você poderá editar:",
        "• título",
        "• subtítulo",
        "• texto",
        "• cor",
        "• banner",
        "• thumbnail",
        "• footer",
        "• modo embed ou imagem + embed"
      ].join("\n")
    );
}

function buildTemplateSelectionComponents(selected = "moderno") {
  const select = new StringSelectMenuBuilder()
    .setCustomId("msg_select_template")
    .setPlaceholder("Selecione um template")
    .addOptions(
      Object.entries(TEMPLATE_META).map(([value, meta]) => ({
        label: meta.label,
        description: meta.description,
        value,
        emoji: meta.emoji,
        default: value === selected
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  return [row];
}

function buildEditorEmbed(session) {
  const meta = getTemplateMeta(session.template);

  const embed = new EmbedBuilder()
    .setTitle(`${meta.emoji} Editor de Mensagem 2.1`)
    .setColor(session.cor || "#5865F2")
    .setDescription("Edite os campos abaixo pelos botões e publique quando estiver tudo pronto.")
    .addFields(
      {
        name: "Template",
        value: `\`${meta.label}\``,
        inline: true
      },
      {
        name: "Modo",
        value: session.usarImagem ? "`Imagem + Embed`" : "`Apenas Embed`",
        inline: true
      },
      {
        name: "Cor",
        value: `\`${session.cor || "#5865F2"}\``,
        inline: true
      },
      {
        name: "Título",
        value: session.titulo || "*Não definido*"
      },
      {
        name: "Subtítulo",
        value: session.subtitulo || "*Não definido*"
      },
      {
        name: "Texto",
        value: session.texto
          ? session.texto.length > 1024
            ? `${session.texto.slice(0, 1020)}...`
            : session.texto
          : "*Não definido*"
      },
      {
        name: "Banner",
        value: session.banner || "*Nenhum*"
      },
      {
        name: "Thumbnail",
        value: session.thumbnail || "*Nenhuma*"
      },
      {
        name: "Footer",
        value: session.footer || "*Nenhum*"
      }
    );

  return embed;
}

function buildPreviewEmbed(session, userTag) {
  const meta = getTemplateMeta(session.template);

  const embed = new EmbedBuilder()
    .setTitle(`${meta.emoji} ${session.titulo || "Sem título"}`)
    .setColor(session.cor || "#5865F2")
    .setDescription(
      [
        session.subtitulo ? `**${session.subtitulo}**` : null,
        session.texto || "*Sem conteúdo definido.*"
      ]
        .filter(Boolean)
        .join("\n\n")
    )
    .setFooter({
      text: session.footer || `Criado por ${userTag}`
    })
    .setTimestamp();

  if (session.banner) embed.setImage(session.banner);
  if (session.thumbnail) embed.setThumbnail(session.thumbnail);

  return embed;
}

function buildEditorComponents(session) {
  const select = new StringSelectMenuBuilder()
    .setCustomId("msg_select_template")
    .setPlaceholder("Trocar template")
    .addOptions(
      Object.entries(TEMPLATE_META).map(([value, meta]) => ({
        label: meta.label,
        description: meta.description,
        value,
        emoji: meta.emoji,
        default: value === session.template
      }))
    );

  const row0 = new ActionRowBuilder().addComponents(select);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("msg_edit_titulo")
      .setLabel("Título")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("msg_edit_subtitulo")
      .setLabel("Subtítulo")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("msg_edit_texto")
      .setLabel("Texto")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("msg_edit_cor")
      .setLabel("Cor")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("msg_edit_banner")
      .setLabel("Banner")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("msg_edit_thumb")
      .setLabel("Thumbnail")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("msg_edit_footer")
      .setLabel("Footer")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("msg_toggle_imagem")
      .setLabel(session.usarImagem ? "Modo: Imagem" : "Modo: Embed")
      .setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("msg_preview")
      .setLabel("Preview")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("msg_publicar")
      .setLabel("Publicar")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("msg_reset_template")
      .setLabel("Resetar")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("msg_cancelar")
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
  );

  return [row0, row1, row2, row3];
}

module.exports = {
  getTemplateDefaults,
  getTemplateMeta,
  buildTemplateSelectionEmbed,
  buildTemplateSelectionComponents,
  buildEditorEmbed,
  buildPreviewEmbed,
  buildEditorComponents
};