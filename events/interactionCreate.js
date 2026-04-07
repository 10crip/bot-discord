const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const CATEGORIA_ID = '1490905371601145939';
const STAFF_ROLE_ID = '1490946877175369891';

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const guild = interaction.guild;
        const user = interaction.user;

        if (
            interaction.customId === 'abrir_ticket_suporte' ||
            interaction.customId === 'abrir_ticket_parceria'
        ) {
            const tipo = interaction.customId === 'abrir_ticket_suporte' ? 'suporte' : 'parceria';

            const nomeLimpo = user.username
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');

            const nomeCanal = `ticket-${nomeLimpo}`;

            const ticketExistente = guild.channels.cache.find(
                channel =>
                    channel.parentId === CATEGORIA_ID &&
                    channel.topic === `ticket-${user.id}`
            );

            if (ticketExistente) {
                return interaction.reply({
                    content: `❌ Você já possui um ticket aberto: ${ticketExistente}`,
                    ephemeral: true
                });
            }

            try {
                const canal = await guild.channels.create({
                    name: nomeCanal,
                    type: ChannelType.GuildText,
                    parent: CATEGORIA_ID,
                    topic: `ticket-${user.id}`,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.EmbedLinks
                            ]
                        },
                        {
                            id: STAFF_ROLE_ID,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.EmbedLinks
                            ]
                        }
                    ]
                });

                const embed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)
                    .setDescription(
                        `${user}, seu ticket foi criado com sucesso.\n\n` +
                        `Explique aqui o que você precisa e aguarde a equipe responder.`
                    )
                    .setColor(tipo === 'suporte' ? 'Blue' : 'Green')
                    .setFooter({ text: `Tipo: ${tipo}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('fechar_ticket')
                        .setLabel('Fechar Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

                await canal.send({
                    content: `${user} <@&${STAFF_ROLE_ID}>`,
                    embeds: [embed],
                    components: [row]
                });

                return interaction.reply({
                    content: `✅ Seu ticket foi criado: ${canal}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Erro ao criar ticket:', error);
                return interaction.reply({
                    content: '❌ Ocorreu um erro ao criar seu ticket.',
                    ephemeral: true
                });
            }
        }

        if (interaction.customId === 'fechar_ticket') {
            const cargoStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);

            if (!cargoStaff) {
                return interaction.reply({
                    content: '❌ Apenas a equipe staff pode fechar tickets.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '🔒 Ticket será fechado em 3 segundos...',
                ephemeral: false
            });

            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Erro ao deletar ticket:', error);
                }
            }, 3000);
        }
    }
};