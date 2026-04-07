const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const db = require('../database.json');

module.exports = {
    name: 'saldo',
    execute(message) {
        const id = message.author.id;

        if (!db[id]) {
            db[id] = { money: 0 };
            fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
        }

        const embed = new EmbedBuilder()
            .setTitle('💰 Carteira')
            .setDescription(`${message.author}, seu saldo atual é **${db[id].money} moedas**.`)
            .setColor('Gold')
            .setThumbnail(message.author.displayAvatarURL());

        message.reply({ embeds: [embed] });
    }
};
