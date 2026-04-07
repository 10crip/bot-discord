const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    execute(message) {
        const guildName = message.guild?.name || 'Servidor';
        const guildIcon = message.guild?.iconURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('📘 Painel de Comandos')
            .setDescription(
                `Bem-vindo ao **sistema de ajuda** de **${guildName}**.\n\n` +
                'Aqui estão todos os comandos disponíveis no bot, organizados de forma clara entre **comandos para membros** e **comandos para staff**.\n\n' +
                'Use cada comando com atenção para aproveitar todos os sistemas disponíveis no servidor.'
            )
            .addFields(
                {
                    name: '╭───────────── 👥 Membros',
                    value:
                        '**Utilidade**\n' +
                        '`!ping` ・ Mostra a latência atual do bot.\n' +
                        '`!help` ・ Exibe este painel de comandos.\n' +
                        '`!avatar @usuário` ・ Mostra o avatar de um usuário.\n\n' +
                        '**Economia**\n' +
                        '`!saldo` ・ Mostra seu saldo atual.\n' +
                        '`!daily` ・ Resgata sua recompensa diária.\n' +
                        '`!work` ・ Trabalha para ganhar moedas.\n' +
                        '`!pay @usuário valor` ・ Transfere moedas para outro usuário.\n' +
                        '`!top` ・ Mostra o ranking de moedas.',
                    inline: false
                },
                {
                    name: '╰───────────── 🛠️ Staff',
                    value:
                        '**Tickets e Postagens**\n' +
                        '`!painel` ・ Envia o painel de tickets no canal atual.\n' +
                        '`!painelpost` ・ Envia o painel de criação de postagens no canal atual.\n' +
                        '`!verificarpost` ・ Define o canal atual como canal de aprovação de postagens.\n' +
                        '`!setadm @cargo` ・ Adiciona um cargo à lista de cargos com permissão de staff.\n\n' +
                        '**Moderação**\n' +
                        '`!clear 1-100` ・ Apaga mensagens do canal.\n' +
                        '`!ban @usuário [motivo]` ・ Bane um usuário do servidor.\n' +
                        '`!kick @usuário [motivo]` ・ Expulsa um usuário do servidor.',
                    inline: false
                },
                {
                    name: 'ℹ️ Observação',
                    value:
                        'Alguns comandos dependem das permissões configuradas no servidor.\n' +
                        'Caso você não consiga usar algum comando de staff, verifique se seu cargo foi adicionado com `!setadm`.',
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
