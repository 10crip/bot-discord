const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const sessionsFile = path.join(dataDir, 'post_sessions.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(sessionsFile)) {
        fs.writeFileSync(sessionsFile, JSON.stringify({}, null, 4), 'utf8');
    }
}

function readSessions() {
    ensureFile();

    try {
        const raw = fs.readFileSync(sessionsFile, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Erro ao ler post_sessions.json:', error);
        return {};
    }
}

function saveSessions(data) {
    ensureFile();

    try {
        fs.writeFileSync(sessionsFile, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Erro ao salvar post_sessions.json:', error);
    }
}

module.exports = {
    name: 'postar',

    async execute(message) {
        try {
            if (!message.guild) {
                return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
            }

            if (message.author.bot) return;

            const sessions = readSessions();

            sessions[message.author.id] = {
                guildId: message.guild.id,
                channelId: message.channel.id,
                step: 'awaiting_title',
                createdAt: Date.now()
            };

            saveSessions(sessions);

            const embedDM = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🚀 Criação de Postagem')
                .setDescription(
                    [
                        'Vamos criar sua postagem.',
                        '',
                        '📝 Envie agora o **título** da sua postagem no privado.',
                        '',
                        'Para cancelar o processo a qualquer momento, envie **cancelar**.'
                    ].join('\n')
                )
                .setFooter({ text: 'Sistema de Postagens' })
                .setTimestamp();

            await message.author.send({ embeds: [embedDM] });

            const confirmEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Check no privado')
                .setDescription('Te enviei uma DM para continuar a criação da sua postagem.')
                .setTimestamp();

            return message.reply({ embeds: [confirmEmbed] });
        } catch (error) {
            console.error('Erro no comando postar:', error);

            return message.reply(
                '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.'
            ).catch(() => null);
        }
    }
};
