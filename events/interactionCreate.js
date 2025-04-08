const fs = require('fs');
const path = require('path');
const { MessageAttachment, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const guild = interaction.guild;

    if (interaction.customId === "open-ticket") {
      const existingTicket = guild.channels.cache.find(c => c.topic === interaction.user.id);
      if (existingTicket) {
        return interaction.reply({
          content: 'You already have an open ticket!',
          ephemeral: true,
        });
      }

      const ticketName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      guild.channels.create(ticketName, {
        parent: client.config.parentOpened,
        topic: interaction.user.id,
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: client.config.roleSupport,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: guild.roles.everyone.id,
            deny: ['VIEW_CHANNEL'],
          },
        ],
        type: "GUILD_TEXT",
      }).then(async (channel) => {
        await interaction.reply({
          content: `Ticket created: <#${channel.id}>`,
          ephemeral: true,
        });

        const embed = new MessageEmbed()
          .setColor('6d6ee8')
          .setAuthor({ name: `${interaction.user.username}'s Ticket` })
          .setDescription('Support will be with you shortly.')
          .setTimestamp();

        const row = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('close-ticket')
            .setLabel('Close')
            .setEmoji('✖')
            .setStyle('DANGER')
        );

        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embed],
          components: [row],
        });
      });
    }

    if (interaction.customId === "close-ticket") {
      const channel = interaction.channel;

      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirm-close')
          .setLabel('Close')
          .setStyle('DANGER'),
        new MessageButton()
          .setCustomId('no')
          .setLabel('Cancel')
          .setStyle('SECONDARY')
      );

      const confirmMessage = await interaction.reply({
        content: 'Are you sure you want to close this ticket?',
        components: [row],
        ephemeral: true,
        fetchReply: true,
      });

      const collector = confirmMessage.createMessageComponentCollector({ componentType: 'BUTTON', time: 10000 });

      collector.on('collect', async (i) => {
        if (i.customId === 'confirm-close') {
          await interaction.editReply({ content: 'Ticket closed.', components: [] });

          channel.edit({
            name: `closed-${channel.name}`,
            permissionOverwrites: [
              {
                id: channel.topic,
                deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
              },
              {
                id: client.config.roleSupport,
                allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
              },
              {
                id: guild.roles.everyone.id,
                deny: ['VIEW_CHANNEL'],
              },
            ],
          });

          const embed = new MessageEmbed()
            .setColor('6d6ee8')
            .setDescription('This ticket has been closed.')
            .setTimestamp();

          const row = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId('delete-ticket')
              .setLabel('Delete')
              .setEmoji('🗑️')
              .setStyle('DANGER')
          );

          await channel.send({ embeds: [embed], components: [row] });
        }

        if (i.customId === 'no') {
          await interaction.editReply({ content: 'Ticket close canceled.', components: [] });
        }

        collector.stop();
      });
    }

    if (interaction.customId === "delete-ticket") {
      const channel = interaction.channel;
      await interaction.reply({ content: 'Saving logs and deleting ticket...' });

      const messages = await channel.messages.fetch({ limit: 100 });
      const filtered = messages
        .filter(m => !m.author.bot)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => `[${new Date(m.createdTimestamp).toLocaleString('el-GR')}] ${m.author.tag}: ${m.content}`)
        .join('\n') || 'No messages in this ticket.';

      const fileName = `logs-${channel.name}.txt`;
      const filePath = path.join(__dirname, '..', 'logs', fileName);

      fs.writeFileSync(filePath, filtered);

      const attachment = new MessageAttachment(filePath);

      const logEmbed = new MessageEmbed()
        .setColor('2f3136')
        .setTitle('📄 Ticket Logs')
        .setDescription(`Ticket: \`${channel.name}\``)
        .setTimestamp();

      const logChannel = client.channels.cache.get(client.config.logsTicket);
      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed], files: [attachment] });
      }

      await channel.send('Deleting ticket in 5 seconds...');
      setTimeout(() => channel.delete(), 5000);
    }
  },
};
