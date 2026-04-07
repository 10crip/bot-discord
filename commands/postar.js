const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const postSessionsPath = path.join(__dirname, '../post_sessions.json');

function garantirArquivoJson(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf8');
    }
}

function lerJson(filePath) {
    garantirArquivoJson(filePath);
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}

function salvarJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    name: 'postar',

    async execute(message) {
        try {
            const postSessions = lerJson(postSessionsPath);

            postSessions[message.author.id] = {
                etapa: 'titulo'
            };

            salvarJson(postSessionsPath, postSessions);

            await message.delete().catch(() => {});

            const embedDM = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🚀 Criação de Postagem')
                .setDescription(
                    'Vamos criar sua postagem!\n\n' +
                    '📝 Envie agora o **título** da sua postagem.'
                )
                .setFooter({ text: 'Sistema de Postagens' })
                .setTimestamp();

            await message.author.send({ embeds: [embedDM] });

        } catch (error) {
            console.error(error);

            await message.reply(
                '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.'
            ).catch(() => {});
        }
    }
};