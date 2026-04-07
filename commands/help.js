const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    execute(message) {
        const guildName = message.guild?.name || 'Servidor';
        const guildIcon = message.guild?.iconURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('📘 Central de Comandos')
            .setDescription(
                `Bem-vindo ao sistema de ajuda de **${guildName}**.\n\n` +
                'Aqui você encontra todos os comandos disponíveis, organizados por categoria.\n\n' +
                'Use os comandos corretamente para aproveitar todos os recursos do bot. 🚀'
            )

            .addFields(
                {
                    name: '╭── 👥 Comandos de Membros',
                    value:
                        '```fix\n' +
                        'ping     → Mostra a latência do bot\n' +
                        'help     → Mostra este painel\n' +
                        'avatar   → Mostra avatar do usuário\n' +
                        '\n' +
                        'saldo    → Mostra seu saldo\n' +
                        'daily    → Recompensa diária\n' +
                        'work     → Trabalhar para ganhar moedas\n' +
                        'pay      → Transferir dinheiro\n' +
                        'top      → Ranking de usuários\n' +
                        '```',
                    inline: false
                },

                {
                    name: '╰── 🛠️ Comandos de Staff',
                    value:
                        '```fix\n' +
                        'painel        → Envia painel de tickets\n' +
                        'painelpost    → Painel de postagens\n' +
                        'verificarpost → Define canal de aprovação\n' +
                        'setadm        → Adiciona cargo staff\n' +
                        '\n' +
                        'clear         → Limpar mensagens\n' +
                        'ban           → Banir usuário\n' +
                        'kick          → Expulsar usuário\n' +
                        '```',
                    inline: false
                },

                {
                    name: '⚠️ Observações',
                    value:
                        '• Alguns comandos requerem permissões específicas.\n' +
                        '• Use `!setadm` para definir quem é staff.\n' +
                        '• O sistema funciona por servidor (multi-guild).',
                    inline: false
                }
            )

            .setThumbnail(guildIcon)
            .setFooter({
                text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
