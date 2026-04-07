const CATEGORY_ID = '1491183093749387364';
const COUNTER_CHANNEL_ID = '1491197677944180816';

function getMembersInCallCount(guild) {
    if (!guild) return 0;

    let totalMembersInCall = 0;

    for (const [, voiceState] of guild.voiceStates.cache) {
        const channel = voiceState.channel;
        if (!channel) continue;

        if (channel.parentId === CATEGORY_ID) {
            totalMembersInCall++;
        }
    }

    return totalMembersInCall;
}

async function updateCallCounter(client) {
    try {
        for (const [, guild] of client.guilds.cache) {
            const counterChannel = guild.channels.cache.get(COUNTER_CHANNEL_ID);
            if (!counterChannel) continue;

            const totalMembersInCall = getMembersInCallCount(guild);
            const newName = `${totalMembersInCall} membros em call`;

            if (counterChannel.name !== newName) {
                await counterChannel.setName(newName).catch(err => {
                    console.error('❌ Erro ao atualizar canal de contagem no ready:', err);
                });
            }
        }
    } catch (error) {
        console.error('❌ Erro ao iniciar contagem de membros em call:', error);
    }
}

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        console.log(`✅ Bot online como ${client.user.tag}`);

        // Espera o cache carregar corretamente
        setTimeout(async () => {
            await updateCallCounter(client);
        }, 2000);
    }
};
