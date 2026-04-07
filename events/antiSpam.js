const { EmbedBuilder } = require('discord.js');

const usersMap = new Map();
const PREFIX = process.env.PREFIX || '!';

function isSpam(message) {
    const now = Date.now();
    const authorId = message.author.id;

    if (!usersMap.has(authorId)) {
        usersMap.set(authorId, {
            messages: [],
            lastContent: ''
        });
    }

    const userData = usersMap.get(authorId);

    userData.messages = userData.messages.filter(timestamp => now - timestamp < 5000);
    userData.messages.push(now);

    const repeated = userData.lastContent === message.content && message.content.length > 0;
    userData.lastContent = message.content;

    const tooFast = userData.messages.length >= 5;
    const tooManyMentions = message.mentions.users.size >= 5;
    const tooManyEmojis = (message.content.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}]/gu) || []).length >= 8;

    return {
        spam: tooFast || repeated || tooManyMentions || tooManyEmojis,
        flags: {
            tooFast,
            repeated,
            tooManyMentions,
            tooManyEmojis
        }
    };
}

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        try {
            if (!message || !message.author) return;
            if (message.author.bot) return;

            // DMs não passam por este evento
            if (!message.guild) return;

            // =========================
            // COMANDOS
            // =========================
            if (message.content.startsWith(PREFIX)) {
                const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
                const commandName = args.shift()?.toLowerCase();

                if (!commandName) return;

                const command = message.client.commands.get(commandName);
                if (!command) return;

                try {
                    await command.execute(message, args);

                    // apaga a mensagem do usuário após o comando responder
                    setTimeout(async () => {
                        await message.delete().catch(() => null);
                    }, 800);
                } catch (error) {
                    console.error(`Erro ao executar comando ${commandName}:`, error);

                    await message.reply('❌ Ocorreu um erro ao executar este comando.').catch(() => null);
                }

                return;
            }

            // =========================
            // ANTI-SPAM
            // =========================
            const spamCheck = isSpam(message);

            if (spamCheck.spam) {
                await message.delete().catch(() => null);

                const warnMessage = await message.channel.send({
                    content: `${message.author}, sua mensagem foi removida por spam/flood.`
                }).catch(() => null);

                if (warnMessage) {
                    setTimeout(async () => {
                        await warnMessage.delete().catch(() => null);
                    }, 5000);
                }
            }
        } catch (error) {
            console.error('Erro no evento antiSpam/messageCreate:', error);
        }
    }
};
