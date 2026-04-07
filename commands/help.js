const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    async execute(message) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('✨ Central Premium de Comandos')
                .setDescription(
                    'Bem-vindo ao painel de ajuda do bot.\n\n' +
                    'Aqui você encontra os principais comandos e recursos disponíveis no servidor.'
                )
                .addFields(
                    {
                        name: '🎫 Atendimento',
                        value:
                            '**!painel**\n' +
                            'Envia o painel premium de atendimento com as opções de **suporte** e **parceria**.',
                        inline: false
                    },
                    {
                        name: '📸 Postagens',
                        value:
                            '**!painelpost**\n' +
                            'Envia o painel fixo para criação de postagens.\n\n' +
                            '**!postar**\n' +
                            'Inicia sua postagem diretamente por comando, ideal quando o painel fixo estiver longe no chat.',
                        inline: false
                    },
                    {
                        name: '🏆 Ranking',
                        value:
                            '**!famosinho**\n' +
                            'Mostra o ranking dos usuários que mais receberam likes nas postagens.',
                        inline: false
                    },
                    {
                        name: '📘 Ajuda',
                        value:
                            '**!help**\n' +
                            'Abre esta central premium com todos os comandos e sistemas atualizados.',
                        inline: false
                    },
                    {
                        name: '💬 Recursos Automáticos',
                        value:
                            '• Sistema de tickets premium\n' +
                            '• Confirmação de ticket com limpeza automática\n' +
                            '• Postagens por DM com aprovação da staff\n' +
                            '• Likes em postagens\n' +
                            '• Comentários por botão\n' +
                            '• Visualização de comentários\n' +
                            '• Ranking de usuários mais curtidos\n' +
                            '• Anti flood / anti spam automático',
                        inline: false
                    },
                    {
                        name: '🛡️ Proteções do Bot',
                        value:
                            'O sistema anti-spam protege o servidor contra:\n\n' +
                            '• Flood de mensagens\n' +
                            '• Mensagens repetidas\n' +
                            '• Spam de links\n' +
                            '• Spam de emojis\n' +
                            '• Spam de menções',
                        inline: false
                    }
                )
                .setThumbnail(message.guild?.iconURL({ dynamic: true }) || null)
                .setFooter({
                    text: `${message.guild?.name || 'Bot'} • Sistema Premium`
                })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro no comando help:', error);
            await message.reply('❌ Ocorreu um erro ao abrir a central de ajuda.');
        }
    }
};
