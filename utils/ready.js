module.exports = {
    name: 'clientReady',
    execute(client) {
        console.log(`Bot ligado como ${client.user.tag}`);
    }
};