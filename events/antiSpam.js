const { Events } = require('discord.js');

const userMessages = new Map();
const userWarnings = new Map();

const CONFIG = {
    intervaloFloodMs: 7000,
    maxMensagensFlood: 5,

    intervaloRepeticaoMs: 15000,
    maxMensagensIguais: 3,

    maxLinksPorJanela: 3,

    maxEmojisPorMensagem: 12,
    maxEmojisCustomPorMensagem: 6,

    maxMencoesUsuariosPorMensagem: 5,
    maxMencoesCargosPorMensagem: 3,
    maxMencoesTotalPorMensagem: 6,

    timeoutMinutos: 10,
    apagarAvisoEmMs: 8000,
    ignorarStaff: true
};

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function temLink(texto) {
    return /(https?:\/\/|www\.)/i.test(texto);
}

function contarEmojisUnicode(texto) {
    const matches = texto.match(/[\p{Extended_Pictographic}]/gu);
    return matches ? matches.length : 0;
}

function contarEmojisCustom(texto) {
    const matches = texto.match(/<a?:\w+:\d+>/g);
    return matches ? matches.length : 0;
}

function obterRegistro(userId) {
    if (!userMessages.has(userId)) {
        userMessages.set(userId, {
            mensagens: []
        });
    }

    return userMessages.get(userId);
}

function limparMensagensAntigas(registro, agora) {
    registro.mensagens = registro.mensagens.filter(msg => {
        return agora - msg.timestamp <= Math.max(CONFIG.intervaloFloodMs, CONFIG.intervaloRepeticaoMs);
    });
}

function contarMensagensRecentes(registro, agora) {
    return registro.mensagens.filter(msg => {
        return agora - msg.timestamp <= CONFIG.intervaloFloodMs;
    }).length;
}

function contarMensagensIguais(registro, conteudo, agora) {
    return registro.mensagens.filter(msg => {
        return msg.content === conteudo &&
            agora - msg.timestamp <= CONFIG.intervaloRepeticaoMs;
    }).length;
}

function contarLinksRecentes(registro, agora) {
    return registro.mensagens.filter(msg => {
        return msg.hasLink &&
            agora - msg.timestamp <= CONFIG.intervaloFloodMs;
    }).length;
}

async function apagarMensagem(message) {
    try {
        if (message.deletable) {
            await message.delete();
        }
    } catch (error) {
        console.error('Erro ao apagar mensagem de spam:', error);
    }
}

async function avisarNoCanal(message, texto) {
    try {
        const aviso = await message.channel.send({
            content: `${message.author} ${texto}`
        });

        setTimeout(() => {
            aviso.delete().catch(() => {});
        }, CONFIG.apagarAvisoEmMs);
    } catch (error) {
        console.error('Erro ao enviar aviso anti-spam:', error);
    }
}

async function aplicarTimeout(member, motivo) {
    try {
        if (!member) return false;
        if (!member.moderatable) return false;

        await member.timeout(CONFIG.timeoutMinutos * 60 * 1000, motivo);
        return true;
    } catch (error) {
        console.error('Erro ao aplicar timeout:', error);
        return false;
    }
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        try {
            if (!message.guild) return;
            if (message.author.bot) return;
            if (!message.member) return;

            if (CONFIG.ignorarStaff && process.env.STAFF_ROLE_ID) {
                if (message.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
                    return;
                }
            }

            const agora = Date.now();
            const userId = message.author.id;
            const conteudoNormalizado = normalizarTexto(message.content);
            const linkNaMensagem = temLink(message.content);

            const emojisUnicode = contarEmojisUnicode(message.content);
            const emojisCustom = contarEmojisCustom(message.content);
            const totalEmojis = emojisUnicode + emojisCustom;

            const mencoesUsuarios = message.mentions.users.size;
            const mencoesCargos = message.mentions.roles.size;
            const mencoesTotal = mencoesUsuarios + mencoesCargos;

            const registro = obterRegistro(userId);

            limparMensagensAntigas(registro, agora);

            registro.mensagens.push({
                timestamp: agora,
                content: conteudoNormalizado,
                hasLink: linkNaMensagem,
                messageId: message.id
            });

            const totalRecente = contarMensagensRecentes(registro, agora);
            const totalIguais = conteudoNormalizado
                ? contarMensagensIguais(registro, conteudoNormalizado, agora)
                : 0;
            const totalLinks = contarLinksRecentes(registro, agora);

            let motivo = null;

            if (totalRecente >= CONFIG.maxMensagensFlood) {
                motivo = 'Flood de mensagens';
            } else if (conteudoNormalizado && totalIguais >= CONFIG.maxMensagensIguais) {
                motivo = 'Spam de mensagens repetidas';
            } else if (linkNaMensagem && totalLinks >= CONFIG.maxLinksPorJanela) {
                motivo = 'Spam de links';
            } else if (totalEmojis >= CONFIG.maxEmojisPorMensagem) {
                motivo = 'Spam de emojis';
            } else if (emojisCustom >= CONFIG.maxEmojisCustomPorMensagem) {
                motivo = 'Spam de emojis personalizados';
            } else if (mencoesUsuarios >= CONFIG.maxMencoesUsuariosPorMensagem) {
                motivo = 'Spam de menções de usuários';
            } else if (mencoesCargos >= CONFIG.maxMencoesCargosPorMensagem) {
                motivo = 'Spam de menções de cargos';
            } else if (mencoesTotal >= CONFIG.maxMencoesTotalPorMensagem) {
                motivo = 'Spam de menções';
            }

            if (!motivo) return;

            await apagarMensagem(message);

            const avisosAtuais = userWarnings.get(userId) || 0;
            const novosAvisos = avisosAtuais + 1;
            userWarnings.set(userId, novosAvisos);

            if (novosAvisos >= 2) {
                const aplicou = await aplicarTimeout(
                    message.member,
                    `Anti-spam automático: ${motivo}`
                );

                await avisarNoCanal(
                    message,
                    aplicou
                        ? `🚫 você foi silenciado por ${CONFIG.timeoutMinutos} minutos por **${motivo.toLowerCase()}**.`
                        : `⚠️ pare com o spam. Motivo: **${motivo.toLowerCase()}**.`
                );

                userWarnings.set(userId, 0);
                registro.mensagens = [];
                return;
            }

            await avisarNoCanal(
                message,
                `⚠️ evite spam. Detectado: **${motivo.toLowerCase()}**. Na próxima, você poderá tomar timeout.`
            );
        } catch (error) {
            console.error('Erro no sistema anti-spam:', error);
        }
    }
};