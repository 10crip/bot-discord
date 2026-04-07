const { EmbedBuilder } = require('discord.js');
const { memberHasStaffRole } = require('../guildConfig');
const { approvePost, rejectPost } = require('../utils/postApprovalSystem');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        try {
            if (!interaction.isButton()) return;

            if (!interaction.customId.startsWith('approve_post:') && !interaction.customId.startsWith('reject_post:')) {
                return;
            }

            if (!interaction.guild) {
                return interaction.reply({
                    content: '❌ Esta interação só pode ser usada em servidor.',
                    ephemeral: true
                });
            }

            if (!memberHasStaffRole(interaction.member)) {
                return interaction.reply({
                    content: '❌ Você não tem permissão para gerenciar postagens.',
                    ephemeral: true
                });
            }

            const [action, postId] = interaction.customId.split(':');
            const publishChannelId = process.env.POST_CHANNEL_ID;

            if (!publishChannelId) {
                return interaction.reply({
                    content: '❌ O canal final de postagens não está configurado no .env.',
                    ephemeral: true
                });
            }

            if (action === 'approve_post') {
                const post = await approvePost(interaction, postId, publishChannelId);

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Postagem aprovada')
                    .setDescription(`A postagem **${post.title || 'Sem título'}** foi aprovada e publicada.`)
                    .setFooter({ text: `Aprovada por ${interaction.user.username}` })
                    .setTimestamp();

                return interaction.update({
                    embeds: [embed],
                    components: []
                });
            }

            if (action === 'reject_post') {
                const post = await rejectPost(interaction, postId);

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Postagem recusada')
                    .setDescription(`A postagem **${post.title || 'Sem título'}** foi recusada.`)
                    .setFooter({ text: `Recusada por ${interaction.user.username}` })
                    .setTimestamp();

                return interaction.update({
                    embeds: [embed],
                    components: []
                });
            }
        } catch (error) {
            console.error('Erro ao processar aprovação de postagem:', error);

            if (interaction.replied || interaction.deferred) return;

            return interaction.reply({
                content: '❌ Ocorreu um erro ao processar a aprovação da postagem.',
                ephemeral: true
            });
        }
    }
};
