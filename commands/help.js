const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Lista de Comandos')
            .setColor('Red')
            .setDescription('Aqui estão os comandos disponíveis:')
            .addFields(
                { name: '!ping', value: 'Mostra a latência do bot.' },
                { name: '!clear <1-100>', value: 'Apaga mensagens do canal.' },
                { name: '!ban @usuário [motivo]', value: 'Bane um usuário.' },
                { name: '!kick @usuário [motivo]', value: 'Expulsa um usuário.' },
                { name: '!saldo', value: 'Mostra seu saldo atual.' }
            )
            .setFooter({ text: 'Bot CityMorgue' });

        message.reply({ embeds: [embed] });
    }
};
