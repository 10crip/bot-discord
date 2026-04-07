const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

const CANAL_POSTAGEM_ID = '1490955877321146458';

module.exports = {
    name: 'painelpost',
    async execute(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Você não tem permissão para enviar o painel de postagem.');
        }

        if (message.channel.id !== CANAL_POSTAGEM_ID) {
            return message.reply(`❌ Use este comando no canal <#${CANAL_POSTAGEM_ID}>.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📸 Criador de Postagens')
            .setDescription('**Clique no botão para criar sua postagem**')
            .setColor('Purple')
            .setFooter({ text: 'A postagem será analisada pela staff antes de ser publicada.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_postagem')
                .setLabel('POSTING')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        await message.reply('✅ Painel de postagem enviado com sucesso.');
    }
};