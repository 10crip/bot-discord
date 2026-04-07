const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            if (!interaction.isButton()) return;

            console.log('Botão clicado:', interaction.customId);

            if (interaction.customId === 'abrir_postagem') {
                await interaction.reply({
                    content: '✅ Botão funcionando. Te chamei no privado.',
                    ephemeral: true
                });

                try {
                    await interaction.user.send(
                        '📩 Olá! Envie o título da sua postagem.'
                    );
                } catch (error) {
                    console.error('Erro ao enviar DM:', error);

                    await interaction.followUp({
                        content: '❌ Não consegui te chamar no privado. Ative sua DM e tente novamente.',
                        ephemeral: true
                    });
                }

                return;
            }
        } catch (error) {
            console.error('Erro no interactionCreate:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar esta interação.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
