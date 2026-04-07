const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    aliases: ['ajuda'],

    async execute(message) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📘 Central de Ajuda')
                .setDescription(
                    'Aqui estão os comandos atualizados do bot.\n\n' +
                    'Use os comandos exatamente como mostrados abaixo.'
                )
                .addFields(
                    {
                        name: '🛠️ Utilidade',
                        value:
                            '`!help` — Mostra esta central de ajuda\n' +
                            '`!ping` — Mostra a latência do bot\n' +
                            '`!avatar [@usuário]` — Mostra o avatar de um usuário',
                        inline: false
                    },
                    {
                        name: '👮 Moderação',
                        value:
                            '`!clear <quantidade>` — Apaga mensagens do chat\n' +
                            '`!kick @usuário [motivo]` — Expulsa um usuário\n' +
                            '`!ban @usuário [motivo]` — Bane um usuário',
                        inline: false
                    },
                    {
                        name: '🎫 Tickets',
                        value:
                            '`!painel` — Envia o painel de tickets com os botões de suporte e parceria\n' +
                            '`!setadm add @cargo` — Adiciona cargo(s) à equipe\n' +
                            '`!setadm remove @cargo` — Remove cargo(s) da equipe\n' +
                            '`!setadm listar` — Lista os cargos atuais da equipe\n' +
                            '`!setadm limpar` — Remove todos os cargos da equipe\n' +
                            '`!setadm @cargo1 @cargo2` — Redefine todos os cargos da equipe',
                        inline: false
                    },
                    {
                        name: '📝 Postagens',
                        value:
                            '`!painelpost` — Envia o painel da central de postagens\n' +
                            '`!postar` — Inicia a criação de postagem no privado\n' +
                            '`!verificarpost` — Define o canal atual como canal de aprovação\n' +
                            '`!famosinho` — Mostra o ranking dos usuários com mais likes',
                        inline: false
                    },
                    {
                        name: '💬 Mensagens',
                        value:
                            '`!mensagem` — Abre o editor profissional de mensagens em DM',
                        inline: false
                    },
                    {
                        name: '💰 Economia',
                        value:
                            '`!saldos` — Mostra informações de saldo',
                        inline: false
                    },
                    {
                        name: '📌 Observações',
                        value:
                            '• Algumas funções dependem de permissões da equipe.\n' +
                            '• Tickets podem ser assumidos e fechados pela equipe configurada com `!setadm`.\n' +
                            '• Postagens são enviadas no privado e passam por aprovação antes de serem publicadas.',
                        inline: false
                    }
                )
                .setFooter({
                    text: `${message.guild?.name || 'Bot'} • Sistema de ajuda`
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro no comando help:', error);
            await message.reply('❌ Ocorreu um erro ao exibir a central de ajuda.').catch(() => null);
        }
    }
};
