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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

// ==================================================
// 📦 CARREGAR COMANDOS
// ==================================================
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            try {
                const command = require(`./commands/${file}`);

                if (!command || !command.name || typeof command.execute !== 'function') {
                    console.log(`⚠️ Comando ignorado: ${file}`);
                    return;
                }

                client.commands.set(command.name, command);
                console.log(`✅ Comando carregado: ${command.name}`);
            } catch (error) {
                console.error(`❌ Erro ao carregar comando ${file}:`, error);
            }
        });
}

// ==================================================
// 📦 CARREGAR EVENTOS
// ==================================================
const eventsPath = path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    let interactionCreateLoaded = false;
    let antiSpamLoaded = false;
    let postSystemLoaded = false;
    let mensagemBuilderLoaded = false;

    eventFiles.forEach(file => {
        try {
            const event = require(`./events/${file}`);

            if (!event || !event.name || typeof event.execute !== 'function') {
                console.log(`⚠️ Evento ignorado: ${file}`);
                return;
            }

            // ==========================================
            // EVITA DUPLICIDADE EM interactionCreate
            // ==========================================
            if (event.name === 'interactionCreate') {
                if (file !== 'interactionCreate.js') {
                    console.log(`⏭️ Evento ignorado para evitar conflito: ${file}`);
                    return;
                }

                if (interactionCreateLoaded) {
                    console.log(`⏭️ interactionCreate duplicado ignorado: ${file}`);
                    return;
                }

                interactionCreateLoaded = true;
            }

            // ==========================================
            // EVITA DUPLICIDADE EM messageCreate
            // ==========================================
            if (event.name === 'messageCreate') {
                // Mantém só estes handlers de messageCreate:
                // - antiSpam.js -> comandos + anti-spam
                // - postSystem.js -> sistema de post por DM
                // - mensagemBuilder.js -> sistema DM do !mensagem (se existir)
                const allowedMessageCreateFiles = [
                    'antiSpam.js',
                    'postSystem.js',
                    'mensagemBuilder.js'
                ];

                if (!allowedMessageCreateFiles.includes(file)) {
                    console.log(`⏭️ messageCreate ignorado para evitar duplicidade: ${file}`);
                    return;
                }

                if (file === 'antiSpam.js') {
                    if (antiSpamLoaded) {
                        console.log(`⏭️ antiSpam duplicado ignorado: ${file}`);
                        return;
                    }
                    antiSpamLoaded = true;
                }

                if (file === 'postSystem.js') {
                    if (postSystemLoaded) {
                        console.log(`⏭️ postSystem duplicado ignorado: ${file}`);
                        return;
                    }
                    postSystemLoaded = true;
                }

                if (file === 'mensagemBuilder.js') {
                    if (mensagemBuilderLoaded) {
                        console.log(`⏭️ mensagemBuilder duplicado ignorado: ${file}`);
                        return;
                    }
                    mensagemBuilderLoaded = true;
                }
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            console.log(`📡 Evento carregado: ${file} -> ${event.name}`);
        } catch (error) {
            console.error(`❌ Erro ao carregar evento ${file}:`, error);
        }
    });
}

// ==================================================
// 🔐 LOGIN
// ==================================================
client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Erro ao conectar o bot:', error);
});
