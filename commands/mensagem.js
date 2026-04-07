const {
  EmbedBuilder
} = require("discord.js");

const {
  createSession,
  deleteSession,
  cleanupExpiredSessions
} = require("../utils/mensagemSessions");

const {
  buildTemplateSelectionEmbed,
  buildTemplateSelectionComponents
} = require("../utils/mensagemTemplates");

module.exports = {
  name: "mensagem",
  description: "Abre o editor profissional de mensagens em DM.",

  async execute(message) {
    if (!message.guild || message.author.bot) return;

    cleanupExpiredSessions();
    deleteSession(message.author.id);

    try {
      const dm = await message.author.createDM();

      createSession(message.author.id, {
        userId: message.author.id,
        guildId: message.guild.id,
        channelId: message.channel.id,
        dmChannelId: dm.id
      });

      const embed = buildTemplateSelectionEmbed();
      const components = buildTemplateSelectionComponents();

      await dm.send({
        embeds: [embed],
        components
      });

      const confirm = new EmbedBuilder()
        .setColor("#57F287")
        .setDescription("📩 Te enviei uma DM com o editor do `!mensagem 2.1`.");

      await message.reply({ embeds: [confirm] });
    } catch (error) {
      console.error("Erro no comando mensagem:", error);

      await message.reply("❌ Não consegui te enviar DM. Ative suas mensagens privadas e tente novamente.");
    }
  }
};
