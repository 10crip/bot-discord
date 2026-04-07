const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType
} = require("discord.js");

const {
  getSession,
  updateSession,
  deleteSession,
  resetSessionToTemplate
} = require("../utils/mensagemSessions");

const {
  getTemplateDefaults,
  buildEditorEmbed,
  buildPreviewEmbed,
  buildEditorComponents
} = require("../utils/mensagemTemplates");

const {
  gerarBannerMensagem,
  isCanvasAvailable
} = require("../utils/bannerGenerator");

function isMensagemInteraction(interaction) {
  if (interaction.isButton() && interaction.customId.startsWith("msg_")) return true;
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("msg_")) return true;
  if (interaction.isModalSubmit() && interaction.customId.startsWith("msg_modal_")) return true;
  return false;
}

function ensureUserSession(interaction) {
  const session = getSession(interaction.user.id);

  if (!session) {
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "❌ Sua sessão expirou. Use `!mensagem` novamente.",
        ephemeral: true
      }).catch(() => {});
    }
    return null;
  }

  return session;
}

function createEditModal({
  customId,
  title,
  label,
  value = "",
  style = TextInputStyle.Short,
  placeholder = "",
  required = true,
  maxLength = 4000
}) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(maxLength);

  if (value) input.setValue(value);
  if (placeholder) input.setPlaceholder(placeholder);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  return modal;
}

function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6})$/.test(color);
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isDmInteraction(interaction) {
  return interaction.channel?.type === ChannelType.DM;
}

async function replyWithUpdatedEditor(interaction, session, message = "✅ Campo atualizado com sucesso.") {
  return interaction.reply({
    content: message,
    embeds: [buildEditorEmbed(session)],
    components: buildEditorComponents(session),
    ephemeral: true
  });
}

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {
    if (!isMensagemInteraction(interaction)) return;

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "msg_select_template") return;

      if (!isDmInteraction(interaction)) {
        return interaction.reply({
          content: "❌ Esse editor só pode ser usado na DM.",
          ephemeral: true
        });
      }

      const session = ensureUserSession(interaction);
      if (!session) return;

      const selected = interaction.values?.[0];
      if (!selected) {
        return interaction.reply({
          content: "❌ Nenhum template selecionado.",
          ephemeral: true
        });
      }

      const defaults = getTemplateDefaults(selected);
      const updated = resetSessionToTemplate(interaction.user.id, defaults);

      return interaction.update({
        embeds: [buildEditorEmbed(updated)],
        components: buildEditorComponents(updated)
      });
    }

    if (interaction.isButton()) {
      if (!isDmInteraction(interaction)) {
        return interaction.reply({
          content: "❌ Esse editor só pode ser usado na DM.",
          ephemeral: true
        });
      }

      const session = ensureUserSession(interaction);
      if (!session) return;

      if (!session.template && interaction.customId !== "msg_cancelar") {
        return interaction.reply({
          content: "❌ Escolha primeiro um template.",
          ephemeral: true
        });
      }

      if (interaction.customId === "msg_edit_titulo") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_titulo",
            title: "Editar Título",
            label: "Título",
            value: session.titulo || "",
            placeholder: "Digite o título da mensagem",
            maxLength: 256
          })
        );
      }

      if (interaction.customId === "msg_edit_subtitulo") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_subtitulo",
            title: "Editar Subtítulo",
            label: "Subtítulo",
            value: session.subtitulo || "",
            placeholder: "Digite o subtítulo",
            maxLength: 256
          })
        );
      }

      if (interaction.customId === "msg_edit_texto") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_texto",
            title: "Editar Texto",
            label: "Texto",
            value: session.texto || "",
            style: TextInputStyle.Paragraph,
            placeholder: "Digite o conteúdo da mensagem",
            maxLength: 4000
          })
        );
      }

      if (interaction.customId === "msg_edit_cor") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_cor",
            title: "Editar Cor",
            label: "Cor HEX",
            value: session.cor || "#5865F2",
            placeholder: "#5865F2",
            maxLength: 7
          })
        );
      }

      if (interaction.customId === "msg_edit_banner") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_banner",
            title: "Editar Banner",
            label: "URL do banner",
            value: session.banner || "",
            placeholder: "https://site.com/imagem.png",
            maxLength: 1000,
            required: false
          })
        );
      }

      if (interaction.customId === "msg_edit_thumb") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_thumb",
            title: "Editar Thumbnail",
            label: "URL da thumbnail",
            value: session.thumbnail || "",
            placeholder: "https://site.com/thumb.png",
            maxLength: 1000,
            required: false
          })
        );
      }

      if (interaction.customId === "msg_edit_footer") {
        return interaction.showModal(
          createEditModal({
            customId: "msg_modal_footer",
            title: "Editar Footer",
            label: "Footer",
            value: session.footer || "",
            placeholder: "Texto do rodapé",
            maxLength: 256,
            required: false
          })
        );
      }

      if (interaction.customId === "msg_toggle_imagem") {
        const updated = updateSession(interaction.user.id, {
          usarImagem: !session.usarImagem
        });

        return interaction.update({
          content: `✅ Modo alterado para **${updated.usarImagem ? "Imagem + Embed" : "Apenas Embed"}**.`,
          embeds: [buildEditorEmbed(updated)],
          components: buildEditorComponents(updated)
        });
      }

      if (interaction.customId === "msg_reset_template") {
        const defaults = getTemplateDefaults(session.template);
        const updated = resetSessionToTemplate(interaction.user.id, defaults);

        return interaction.update({
          content: "♻️ Template resetado com sucesso.",
          embeds: [buildEditorEmbed(updated)],
          components: buildEditorComponents(updated)
        });
      }

      if (interaction.customId === "msg_preview") {
        const updated = getSession(interaction.user.id);
        const previewEmbed = buildPreviewEmbed(updated, interaction.user.tag);

        if (updated.usarImagem) {
          if (!isCanvasAvailable()) {
            return interaction.reply({
              content: "⚠️ O modo imagem está indisponível neste deploy porque o módulo `canvas` não foi carregado. Você ainda pode usar o modo embed normalmente.",
              embeds: [previewEmbed],
              ephemeral: true
            });
          }

          try {
            await interaction.deferReply({ ephemeral: true });

            const buffer = await gerarBannerMensagem(updated);
            if (!buffer) {
              return interaction.editReply({
                content: "⚠️ Não foi possível gerar a imagem neste ambiente.",
                embeds: [previewEmbed]
              });
            }

            const attachment = new AttachmentBuilder(buffer, {
              name: "mensagem-preview.png"
            });

            return interaction.editReply({
              content: "🖼️ Preview gerado com sucesso.",
              embeds: [previewEmbed],
              files: [attachment]
            });
          } catch (error) {
            console.error("Erro no preview:", error);

            return interaction.editReply({
              content: "❌ Não consegui gerar a imagem do preview. Verifique as URLs do banner/thumbnail."
            });
          }
        }

        return interaction.reply({
          content: "✅ Aqui está o preview da sua mensagem.",
          embeds: [previewEmbed],
          ephemeral: true
        });
      }

      if (interaction.customId === "msg_publicar") {
        const updated = getSession(interaction.user.id);

        if (!updated.guildId || !updated.channelId) {
          return interaction.reply({
            content: "❌ Não encontrei o canal original dessa sessão.",
            ephemeral: true
          });
        }

        const guild = interaction.client.guilds.cache.get(updated.guildId);
        if (!guild) {
          return interaction.reply({
            content: "❌ Não encontrei o servidor original.",
            ephemeral: true
          });
        }

        const channel = guild.channels.cache.get(updated.channelId);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({
            content: "❌ Não encontrei um canal válido para publicar a mensagem.",
            ephemeral: true
          });
        }

        const finalEmbed = buildPreviewEmbed(updated, interaction.user.tag);

        try {
          await interaction.deferReply({ ephemeral: true });

          if (updated.usarImagem) {
            if (!isCanvasAvailable()) {
              await channel.send({
                embeds: [finalEmbed]
              });

              deleteSession(interaction.user.id);

              return interaction.editReply({
                content: "⚠️ O deploy não carregou o `canvas`, então publiquei a mensagem apenas como embed."
              });
            }

            const buffer = await gerarBannerMensagem(updated);

            if (!buffer) {
              await channel.send({
                embeds: [finalEmbed]
              });

              deleteSession(interaction.user.id);

              return interaction.editReply({
                content: "⚠️ Não foi possível gerar a imagem neste ambiente, então publiquei apenas o embed."
              });
            }

            const attachment = new AttachmentBuilder(buffer, {
              name: "mensagem-final.png"
            });

            await channel.send({
              files: [attachment],
              embeds: [finalEmbed]
            });
          } else {
            await channel.send({
              embeds: [finalEmbed]
            });
          }

          deleteSession(interaction.user.id);

          return interaction.editReply({
            content: "✅ Mensagem publicada com sucesso no canal original."
          });
        } catch (error) {
          console.error("Erro ao publicar:", error);

          return interaction.editReply({
            content: "❌ Não consegui publicar a mensagem. Verifique permissões do bot e as URLs usadas."
          });
        }
      }

      if (interaction.customId === "msg_cancelar") {
        deleteSession(interaction.user.id);

        return interaction.update({
          content: "❌ Criação da mensagem cancelada.",
          embeds: [],
          components: []
        });
      }
    }

    if (interaction.isModalSubmit()) {
      if (!isDmInteraction(interaction)) {
        return interaction.reply({
          content: "❌ Esse editor só pode ser usado na DM.",
          ephemeral: true
        });
      }

      const session = ensureUserSession(interaction);
      if (!session) return;

      const value = interaction.fields.getTextInputValue("value")?.trim() || "";

      if (interaction.customId === "msg_modal_titulo") {
        const updated = updateSession(interaction.user.id, {
          titulo: value || "Sem título"
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_subtitulo") {
        const updated = updateSession(interaction.user.id, {
          subtitulo: value || null
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_texto") {
        const updated = updateSession(interaction.user.id, {
          texto: value || "Sem conteúdo."
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_cor") {
        if (!isValidHexColor(value)) {
          return interaction.reply({
            content: "❌ Cor inválida. Use formato HEX, por exemplo: `#5865F2`",
            ephemeral: true
          });
        }

        const updated = updateSession(interaction.user.id, {
          cor: value
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_banner") {
        if (value && !isValidUrl(value)) {
          return interaction.reply({
            content: "❌ URL do banner inválida.",
            ephemeral: true
          });
        }

        const updated = updateSession(interaction.user.id, {
          banner: value || null
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_thumb") {
        if (value && !isValidUrl(value)) {
          return interaction.reply({
            content: "❌ URL da thumbnail inválida.",
            ephemeral: true
          });
        }

        const updated = updateSession(interaction.user.id, {
          thumbnail: value || null
        });
        return replyWithUpdatedEditor(interaction, updated);
      }

      if (interaction.customId === "msg_modal_footer") {
        const updated = updateSession(interaction.user.id, {
          footer: value || "Sistema de Mensagens 2.1"
        });
        return replyWithUpdatedEditor(interaction, updated);
      }
    }
  }
};
