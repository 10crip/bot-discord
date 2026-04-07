const {
    EmbedBuilder
} = require('discord.js');

const {
    getSessions,
    saveSessions,
    criarSessao,
    buildPreviewEmbed,
    buildEditorRows
} = require('../utils/messageBuilder');

module.exports = {
    name: 'mensagem',

    async execute(message) {
        try {
            if (!message.guild) return;

            const sessions = getSessions();
            sessions[message.author.id] = criarSessao(
                message.author.id,
                message.guild.id,
                message.channel.id
            );
            saveSessions(sessions);

            await message.delete().catch(() => {});

            const dm = await message.author.createDM();

            const sessao = sessions[message.author.id];

            const intro = new EmbedBuilder()
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

            const preview = buildPreviewEmbed(sessao, message.author);
            const rows = buildEditorRows(sessao);

            const editorMessage = await dm.send({
                embeds: [intro, preview],
                components: rows
            });

            sessions[message.author.id].editorMessageId = editorMessage.id;
            saveSessions(sessions);

            const aviso = await message.channel.send({
                content: `${message.author} 📩 Te enviei o editor de mensagens no privado.`
            });

            setTimeout(() => {
                aviso.delete().catch(() => {});
            }, 10000);
        } catch (error) {
            console.error('Erro no comando mensagem:', error);

            await message.reply(
                '❌ Não consegui abrir o editor no seu privado. Verifique se sua DM está aberta.'
            ).catch(() => {});
        }
    }
};