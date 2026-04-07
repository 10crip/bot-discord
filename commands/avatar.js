const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    execute(message) {
        const usuario = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${usuario.username}`)
            .setImage(usuario.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor('Blue')
            .setFooter({ text: `Solicitado por ${message.author.username}` });

        message.reply({ embeds: [embed] });
    }
};