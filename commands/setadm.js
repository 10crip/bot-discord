const {
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const {
    setStaffRoles,
    getStaffRoles,
    addStaffRole,
    removeStaffRole
} = require('../guildConfig');

module.exports = {
    name: 'setadm',
    description: 'Gerencia os cargos da equipe (staff).',

    async execute(message, args) {
        try {
            if (!message.guild) {
                return message.reply('❌ Este comando só pode ser usado em servidor.');
            }

            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('❌ Apenas administradores podem usar este comando.');
            }

            const sub = args[0]?.toLowerCase();
            const mentionedRoles = [...message.mentions.roles.values()];
            const guildId = message.guild.id;

            // ==================================================
            // 📋 LISTAR
            // ==================================================
            if (sub === 'listar') {
                const roles = getStaffRoles(guildId);

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('👨‍💼 Cargos da equipe')
                    .setDescription(
                        roles.length
                            ? roles.map(id => `<@&${id}>`).join('\n')
                            : 'Nenhum cargo configurado.'
                    )
                    .setFooter({ text: message.guild.name })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // ==================================================
            // ➕ ADD
            // ==================================================
            if (sub === 'add') {
                if (!mentionedRoles.length) {
                    return message.reply('❌ Mencione ao menos um cargo para adicionar.');
                }

                mentionedRoles.forEach(role => addStaffRole(guildId, role.id));

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Cargo(s) adicionados')
                    .setDescription(mentionedRoles.map(r => `<@&${r.id}>`).join('\n'))
                    .setFooter({ text: 'Equipe atualizada' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // ==================================================
            // ➖ REMOVE
            // ==================================================
            if (sub === 'remove') {
                if (!mentionedRoles.length) {
                    return message.reply('❌ Mencione ao menos um cargo para remover.');
                }

                mentionedRoles.forEach(role => removeStaffRole(guildId, role.id));

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🗑️ Cargo(s) removidos')
                    .setDescription(mentionedRoles.map(r => `<@&${r.id}>`).join('\n'))
                    .setFooter({ text: 'Equipe atualizada' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // ==================================================
            // 🧹 LIMPAR
            // ==================================================
            if (sub === 'limpar') {
                setStaffRoles(guildId, []);

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🧹 Lista limpa')
                    .setDescription('Todos os cargos da equipe foram removidos.')
                    .setFooter({ text: message.guild.name })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // ==================================================
            // 🔄 SUBSTITUIR (modo direto)
            // ==================================================
            if (mentionedRoles.length) {
                const roleIds = mentionedRoles.map(r => r.id);
                setStaffRoles(guildId, roleIds);

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🔄 Cargos redefinidos')
                    .setDescription(mentionedRoles.map(r => `<@&${r.id}>`).join('\n'))
                    .setFooter({ text: 'Equipe atualizada' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // ==================================================
            // ❓ AJUDA
            // ==================================================
            const embed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚙️ Comando setadm')
                .setDescription('Gerencie os cargos da equipe.')
                .addFields(
                    {
                        name: '➕ Adicionar',
                        value: '`!setadm add @cargo`',
                        inline: false
                    },
                    {
                        name: '➖ Remover',
                        value: '`!setadm remove @cargo`',
                        inline: false
                    },
                    {
                        name: '📋 Listar',
                        value: '`!setadm listar`',
                        inline: false
                    },
                    {
                        name: '🧹 Limpar',
                        value: '`!setadm limpar`',
                        inline: false
                    },
                    {
                        name: '🔄 Substituir tudo',
                        value: '`!setadm @cargo1 @cargo2`',
                        inline: false
                    }
                )
                .setFooter({ text: message.guild.name })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro no setadm:', error);
            return message.reply('❌ Ocorreu um erro.');
        }
    }
};
