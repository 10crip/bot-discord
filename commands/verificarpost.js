const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { memberHasStaffRole, setPostApprovalChannel } = require('../guildConfig');

module.exports = {
    name: 'verificarpost',

    async execute(message) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        const isAdministrator = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdministrator && !memberHasStaffRole(message.member)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        setPostApprovalChannel(message.guild.id, message.channel.id);

        const embed = new EmbedBuilder()
            .setTitle('✅ Canal de aprovação configurado')
            .setColor('#57F287')
            .setDescription(`Este canal foi definido como **canal de aprovação de postagens** deste servidor.`)
            .addFields(
                {
                    name: 'Canal configurado',
                    value: `${message.channel}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Configuração' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
