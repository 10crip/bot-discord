const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Comandos do Bot')
            .setColor('Red')
            .setDescription('Aqui estão os comandos disponíveis no bot:')
            .addFields(
                { name: '!ping', value: 'Mostra a latência do bot.', inline: false },
                { name: '!help', value: 'Mostra esta lista de comandos.', inline: false },
                { name: '!avatar @usuário', value: 'Mostra o avatar de um usuário.', inline: false },

                { name: '!painel', value: 'Envia o painel de tickets no canal configurado.', inline: false },
                { name: '!painelpost', value: 'Envia o painel de criação de postagem com revisão da staff.', inline: false },

                { name: '!saldo', value: 'Mostra seu saldo atual.', inline: false },
                { name: '!daily', value: 'Resgata sua recompensa diária.', inline: false },
                { name: '!work', value: 'Trabalha para ganhar moedas.', inline: false },
                { name: '!pay @usuário valor', value: 'Transfere moedas para outro usuário.', inline: false },
                { name: '!top', value: 'Mostra o ranking de moedas.', inline: false },

                { name: '!clear 1-100', value: 'Apaga mensagens do canal.', inline: false },
                { name: '!ban @usuário [motivo]', value: 'Bane um usuário do servidor.', inline: false },
                { name: '!kick @usuário [motivo]', value: 'Expulsa um usuário do servidor.', inline: false }
            )
            .setFooter({ text: `Pedido por ${message.author.username}` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
