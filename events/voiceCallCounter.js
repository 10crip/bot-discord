const CATEGORY_ID = '1491183093749387364';
const COUNTER_CHANNEL_ID = '1491197677944180816';

async function updateCallCounter(guild) {
    try {
        if (!guild) return;

        const counterChannel = guild.channels.cache.get(COUNTER_CHANNEL_ID);
        if (!counterChannel) {
            console.log('⚠️ Canal de contagem não encontrado.');
            return;
        }

        const voiceChannelsInCategory = guild.channels.cache.filter(channel =>
            channel.parentId === CATEGORY_ID &&
            (channel.type === 2 || channel.type === 13)
        );

        let totalMembersInCall = 0;

        for (const [, channel] of voiceChannelsInCategory) {
            totalMembersInCall += channel.members.size;
        }

        const newName = `${totalMembersInCall} membros em call`;

        if (counterChannel.name !== newName) {
            await counterChannel.setName(newName).catch(err => {
                console.error('❌ Erro ao atualizar nome do canal de contagem:', err);
            });
        }
    } catch (error) {
        console.error('❌ Erro no sistema de contagem de calls:', error);
    }
}

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        const oldWasInCategory = oldChannel?.parentId === CATEGORY_ID;
        const newIsInCategory = newChannel?.parentId === CATEGORY_ID;

        // Só atualiza se a mudança envolver a categoria monitorada
        if (!oldWasInCategory && !newIsInCategory) return;

        await updateCallCounter(guild);
    }
};