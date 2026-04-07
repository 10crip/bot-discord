const CATEGORY_ID = '1491183093749387364';
const COUNTER_CHANNEL_ID = '1491197677944180816';

const countCache = new Map();
const updateTimers = new Map();

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

async function deleteEmptyTemporaryCalls(guild) {
    try {
        const voiceChannelsInCategory = guild.channels.cache.filter(channel =>
            channel.parentId === CATEGORY_ID &&
            channel.type === 2
        );

        for (const [, channel] of voiceChannelsInCategory) {
            if (channel.id === COUNTER_CHANNEL_ID) continue;

            if (channel.members.size === 0) {
                await channel.delete().catch(() => null);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao apagar calls vazias:', error);
    }
}

async function updateCallCounter(guild) {
    try {
        if (!guild) return;

        const counterChannel = guild.channels.cache.get(COUNTER_CHANNEL_ID);
        if (!counterChannel) {
            console.log('⚠️ Canal de contagem não encontrado.');
            return;
        }

        const totalMembersInCall = getMembersInCallCount(guild);
        const cachedCount = countCache.get(guild.id);
        const newName = `${totalMembersInCall} membros em call`;

        if (cachedCount === totalMembersInCall && counterChannel.name === newName) {
            return;
        }

        if (counterChannel.name !== newName) {
            await counterChannel.setName(newName).catch(err => {
                console.error('❌ Erro ao atualizar nome do canal de contagem:', err);
            });
        }

        countCache.set(guild.id, totalMembersInCall);
    } catch (error) {
        console.error('❌ Erro no sistema de contagem de calls:', error);
    }
}

function scheduleUpdate(guild) {
    if (!guild) return;

    const existingTimer = updateTimers.get(guild.id);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
        updateTimers.delete(guild.id);
        await deleteEmptyTemporaryCalls(guild);
        await updateCallCounter(guild);
    }, 1000);

    updateTimers.set(guild.id, timer);
}

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        try {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            const oldWasInCategory = oldChannel?.parentId === CATEGORY_ID;
            const newIsInCategory = newChannel?.parentId === CATEGORY_ID;

            if (!oldWasInCategory && !newIsInCategory) return;

            scheduleUpdate(guild);
        } catch (error) {
            console.error('❌ Erro no evento voiceStateUpdate:', error);
        }
    }
};
