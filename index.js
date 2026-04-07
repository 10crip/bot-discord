require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

fs.readdirSync('./commands').forEach(file => {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
});

fs.readdirSync('./events').forEach(file => {
    const event = require(`./events/${file}`);
    client.on(event.name, (...args) => event.execute(...args, client));
});

client.login(process.env.TOKEN);