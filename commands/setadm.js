const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getGuildConfig, setStaffRoles } = require('../utils/guildConfig');

module.exports = {
    name: 'setadm',

    async execute(message, args) {
        if (!message.guild) {
            return message.reply('❌ Este comando só pode ser usado dentro de um servidor.');
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores podem configurar os cargos de staff.');
        }

        const guildConfig = getGuildConfig(message.guild.id);

        if (!args.length) {
            const cargosAtuais = guildConfig.staffRoleIds.length
                ? guildConfig.staffRoleIds
                    .map(roleId => message.guild.roles.cache.get(roleId))
                    .filter(Boolean)
                    .map(role => `${role}`)
                    .join(', ')
                : 'Nenhum cargo configurado.';

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Configuração de Staff')
                .setColor('#5865F2')
                .setDescription(
                    [
                        `**Cargos atuais:** ${cargosAtuais}`,
                        '',
                        '**Como usar:**',
                        '`!setadm @Cargo1 @Cargo2 @Cargo3`',
                        '',
                        '**Outros usos:**',
                        '`!setadm limpar` → remove todos os cargos configurados'
                    ].join('\n')
                );

            return message.reply({ embeds: [embed] });
        }

        const firstArg = args[0]?.toLowerCase();

        if (firstArg === 'limpar') {
            setStaffRoles(message.guild.id, []);

            const embed = new EmbedBuilder()
                .setTitle('✅ Staff resetada')
                .setColor('#57F287')
                .setDescription('Todos os cargos de staff deste servidor foram removidos.');

            return message.reply({ embeds: [embed] });
        }

        const roleIds = new Set();

        for (const role of message.mentions.roles.values()) {
            roleIds.add(role.id);
        }

        for (const arg of args) {
            const cleaned = arg.replace(/[<@&>]/g, '');
            if (/^\d+$/.test(cleaned)) {
                const foundRole = message.guild.roles.cache.get(cleaned);
                if (foundRole) {
                    roleIds.add(foundRole.id);
                }
            }
        }

        if (!roleIds.size) {
            return message.reply(
                '❌ Você precisa mencionar pelo menos um cargo válido.\nExemplo: `!setadm @Staff @Moderador`'
            );
        }

        const finalRoles = [...roleIds];
        setStaffRoles(message.guild.id, finalRoles);

        const cargosFormatados = finalRoles
            .map(roleId => message.guild.roles.cache.get(roleId))
            .filter(Boolean)
            .map(role => `${role}`)
            .join(', ');

        const embed = new EmbedBuilder()
            .setTitle('✅ Cargos de staff configurados')
            .setColor('#57F287')
            .setDescription(`Os cargos com permissão de staff agora são:\n${cargosFormatados}`);

        return message.reply({ embeds: [embed] });
    }
};