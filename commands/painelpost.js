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
            .setTitle('📣 Central de Postagens da Comunidade')
            .setDescription(
                '### Crie sua postagem de forma rápida e organizada\n' +
                'Clique no botão abaixo para enviar sua publicação para análise da equipe.\n\n' +
                '**O que você poderá enviar:**\n' +
                '• título da postagem\n' +
                '• imagem **ou** vídeo\n\n' +
                '**Como funciona:**\n' +
                '1. clique em **POSTING**\n' +
                '2. o bot vai te chamar no privado\n' +
                '3. envie o título\n' +
                '4. envie a mídia\n' +
                '5. a staff revisa antes de publicar\n\n' +
                '✅ processo privado, organizado e seguro'
            )
            .setColor('Purple')
            .setFooter({
                text: 'As postagens passam por aprovação antes de serem publicadas.'
            })
            .setTimestamp();

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
