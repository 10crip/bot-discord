require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            const command = require(`./commands/${file}`);
            if (command?.name) {
                client.commands.set(command.name, command);
            }
        });
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    fs.readdirSync(eventsPath)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            const event = require(`./events/${file}`);
            if (!event?.name || !event?.execute) return;

            client.on(event.name, (...args) => event.execute(...args, client));
        });
}

client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
