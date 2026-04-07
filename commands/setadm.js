const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { addStaffRole, getStaffRoles } = require('../guildConfig');

module.exports = {
    name: 'setadm',

    async execute(message, args) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores podem configurar cargos de staff.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
            return message.reply('❌ Você precisa mencionar um cargo válido ou informar o ID do cargo.');
        }

        addStaffRole(message.guild.id, role.id);

        const staffRoles = getStaffRoles(message.guild.id)
            .map(roleId => {
                const guildRole = message.guild.roles.cache.get(roleId);
                return guildRole ? `<@&${guildRole.id}>` : `Cargo removido (${roleId})`;
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Cargo de staff adicionado')
            .setColor('#5865F2')
            .setDescription(`O cargo ${role} agora possui permissão de **staff** neste servidor.`)
            .addFields(
                {
                    name: 'Cargos com permissão',
                    value: staffRoles || 'Nenhum cargo configurado.',
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Staff' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
