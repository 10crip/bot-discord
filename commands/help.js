const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Comandos do Bot')
            .setColor('Red')
            .setDescription('Lista de comandos disponíveis')
            .addFields(
                { name: '!ping', value: 'Mostra a latência do bot.', inline: false },
                { name: '!help', value: 'Mostra esta lista de comandos.', inline: false },
                { name: '!avatar @usuário', value: 'Mostra o avatar de um usuário.', inline: false },
                { name: '!saldo', value: 'Mostra seu saldo.', inline: false },
                { name: '!daily', value: 'Resgata recompensa diária.', inline: false },
                { name: '!work', value: 'Trabalha para ganhar moedas.', inline: false },
                { name: '!pay @usuário valor', value: 'Envia moedas para outro usuário.', inline: false },
                { name: '!top', value: 'Mostra o ranking de moedas.', inline: false },
                { name: '!clear 1-100', value: 'Apaga mensagens.', inline: false },
                { name: '!ban @usuário motivo', value: 'Bane um usuário.', inline: false },
                { name: '!kick @usuário motivo', value: 'Expulsa um usuário.', inline: false }
            )
            .setFooter({ text: `Pedido por ${message.author.username}` });

        message.reply({ embeds: [embed] });
    }
};
