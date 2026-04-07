const CATEGORY_ID = '1491183093749387364';
const COUNTER_CHANNEL_ID = '1491197677944180816';

async function updateCallCounter(client) {
    try {
        const guilds = client.guilds.cache;

        for (const [, guild] of guilds) {
            const counterChannel = guild.channels.cache.get(COUNTER_CHANNEL_ID);
            if (!counterChannel) continue;

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

        // Atualiza a contagem assim que o bot ligar
        await updateCallCounter(client);
    }
};
