const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`Latência da API: **${message.client.ws.ping}ms**`)
            .setColor('Red')
            .setFooter({ text: `Solicitado por ${message.author.username}` });

        message.reply({ embeds: [embed] });
    }
};
