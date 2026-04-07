const {
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const {
    setStaffRoles,
    getStaffRoles
} = require('../guildConfig');

module.exports = {
    name: 'setadm',
    description: 'Define os cargos da equipe que podem assumir e fechar tickets.',

    async execute(message, args) {
        try {
            if (!message.guild) {
                return message.reply('❌ Este comando só pode ser usado em servidor.');
            }

            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ Apenas administradores podem usar este comando.');
            }

            const mentionedRoles = [...message.mentions.roles.values()];

            if (!mentionedRoles.length) {
                const currentRoles = getStaffRoles(message.guild.id);

                const embed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⚙️ Configuração de cargos da equipe')
                    .setDescription(
                        'Use o comando mencionando um ou mais cargos.\n\n' +
                        '**Exemplo:**\n' +
                        '`!setadm @Staff @Moderador @Suporte`'
                    )
                    .addFields({
                        name: 'Cargos configurados atualmente',
                        value: currentRoles.length
                            ? currentRoles.map(roleId => `<@&${roleId}>`).join('\n')
                            : 'Nenhum cargo configurado.',
                        inline: false
                    })
                    .setFooter({
                        text: `${message.guild.name} • Sistema de equipe`
                    })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const roleIds = mentionedRoles.map(role => role.id);
            setStaffRoles(message.guild.id, roleIds);

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Cargos da equipe atualizados')
                .setDescription(
                    'Os cargos abaixo agora fazem parte da equipe autorizada.\n\n' +
                    'Membros com esses cargos poderão usar ações de staff, como assumir e fechar tickets.'
                )
                .addFields({
                    name: 'Cargos definidos',
                    value: mentionedRoles.map(role => `<@&${role.id}>`).join('\n'),
                    inline: false
                })
                .setFooter({
                    text: `${message.guild.name} • Configuração salva`
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro no comando setadm:', error);
            return message.reply('❌ Ocorreu um erro ao configurar os cargos da equipe.');
        }
    }
};
