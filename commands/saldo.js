const fs = require('fs');
const db = require('../database.json');

module.exports = {
    name: 'saldo',
    execute(message) {
        const id = message.author.id;

        if (!db[id]) db[id] = { money: 0 };

        fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

        message.reply(`💰 Seu saldo: ${db[id].money}`);
    }
};