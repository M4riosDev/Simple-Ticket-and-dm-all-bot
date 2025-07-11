const { MessageEmbed, MessageActionRow, MessageButton, MessageAttachment } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isSelectMenu() && !interaction.isButton()) return;

    if (interaction.isSelectMenu() && interaction.customId === 'ticket-type') {
      try {
        const ticketTypes = {
          'support': {
            name: 'support',
            color: '#3498db',
            roles: [client.config.roleSupport],
            category: client.config.categories.support
          },
          'staff-report': {
            name: 'staff-report',
            color: '#e74c3c',
            roles: [client.config.roleAdmin],
            category: client.config.categories.reports
          },
          'refund': {
            name: 'refund',
            color: '#f1c40f',
            roles: [client.config.roleBilling],
            category: client.config.categories.billing
          },
          'owner': {
            name: 'owner',
            color: '#9b59b6',
            roles: [client.config.roleOwner],
            category: client.config.categories.owner
          }
        };

        const type = interaction.values[0];
        const config = ticketTypes[type];
        const user = interaction.user;
        const channelName = `${config.name}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        const existingTicket = interaction.guild.channels.cache.find(
          c => c.topic === user.id && !c.name.startsWith('closed-')
        );

        if (existingTicket) {
          return interaction.reply({
            content: `You already have an open ticket: ${existingTicket}`,
            ephemeral: true
          });
        }

        const channel = await interaction.guild.channels.create(channelName, {
          type: 'GUILD_TEXT',
          topic: user.id,
          parent: config.category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: ['VIEW_CHANNEL']
            },
            {
              id: user.id,
              allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
            },
            ...config.roles.map(roleId => ({
              id: roleId,
              allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES']
            }))
          ]
        });

        const embed = new MessageEmbed()
          .setColor(config.color)
          .setAuthor(`${user.username}'s Ticket`, user.displayAvatarURL())
          .setDescription(`**Ticket Type**: ${type.replace('-', ' ').toUpperCase()}\n\nPlease describe your issue in detail.`)
          .setFooter(`User ID: ${user.id}`)
          .setTimestamp();

        const buttons = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('close-ticket')
            .setLabel('Close Ticket')
            .setStyle('DANGER')
            .setEmoji('🔒')
        );

        await channel.send({
          content: `${user} ${config.roles.map(r => `<@&${r}>`).join(' ')}`,
          embeds: [embed],
          components: [buttons]
        });

        await interaction.reply({
          content: `Your ${config.name.replace('-', ' ')} ticket has been created: ${channel}`,
          ephemeral: true
        });

      } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.reply({
          content: 'An error occurred while creating your ticket. Please try again later.',
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.isButton()) {
      try {
        switch (interaction.customId) {
          case 'close-ticket':
            await handleCloseTicket(interaction, client);
            break;
          case 'confirm-close':
            await handleConfirmClose(interaction, client);
            break;
          case 'reopen-ticket':
            await handleReopenTicket(interaction, client);
            break;
          case 'delete-ticket':
            await handleDeleteTicket(interaction, client);
            break;
          case 'cancel-close':
            await interaction.update({ content: 'Ticket close canceled.', components: [] });
            break;
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        await interaction.reply({
          content: 'An error occurred while processing your request.',
          ephemeral: true
        });
      }
    }
  }
};

async function handleCloseTicket(interaction, client) {
  const confirmEmbed = new MessageEmbed()
    .setColor('#f39c12')
    .setTitle('Confirm Ticket Closure')
    .setDescription('Are you sure you want to close this ticket?');

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('confirm-close')
      .setLabel('Confirm Close')
      .setStyle('DANGER'),
    new MessageButton()
      .setCustomId('cancel-close')
      .setLabel('Cancel')
      .setStyle('SECONDARY')
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
}

async function handleConfirmClose(interaction, client) {
  const channel = interaction.channel;
  const user = interaction.guild.members.cache.get(channel.topic);

  await channel.edit({
    name: `closed-${channel.name}`,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: ['VIEW_CHANNEL']
      },
      {
        id: user.id,
        deny: ['SEND_MESSAGES'],
        allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
      }
    ]
  });

  const transcript = await createTranscript(channel, {
    limit: -1,
    returnType: 'buffer',
    filename: `${channel.name}.html`,
    saveImages: true,
    poweredBy: false
  });

  const attachment = new MessageAttachment(transcript, `${channel.name}.html`);

  const logChannel = client.channels.cache.get(client.config.logsTicket);
  if (logChannel) {
    const logEmbed = new MessageEmbed()
      .setColor('#3498db')
      .setTitle('Ticket Closed')
      .setDescription(`**Ticket**: ${channel.name}\n**Closed by**: ${interaction.user.tag}`)
      .setTimestamp();

    await logChannel.send({ 
      embeds: [logEmbed], 
      files: [attachment] 
    });
  }

  // Update ticket channel
  const closedEmbed = new MessageEmbed()
    .setColor('#e74c3c')
    .setTitle('Ticket Closed')
    .setDescription(`This ticket has been closed by ${interaction.user}`)
    .setFooter('You can reopen this ticket if needed');

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('reopen-ticket')
      .setLabel('Reopen')
      .setStyle('SUCCESS')
      .setEmoji('🔓'),
    new MessageButton()
      .setCustomId('delete-ticket')
      .setLabel('Delete')
      .setStyle('DANGER')
      .setEmoji('🗑️')
  );

  await interaction.update({ components: [] });
  await channel.send({ embeds: [closedEmbed], components: [row] });
}

async function handleReopenTicket(interaction, client) {
  const channel = interaction.channel;
  const user = interaction.guild.members.cache.get(channel.topic);
  await channel.edit({
    name: channel.name.replace('closed-', ''),
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: ['VIEW_CHANNEL']
      },
      {
        id: user.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
      }
    ]
  });

  const embed = new MessageEmbed()
    .setColor('#2ecc71')
    .setTitle('Ticket Reopened')
    .setDescription(`This ticket has been reopened by ${interaction.user}`);

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('delete-ticket')
      .setLabel('Close Ticket')
      .setStyle('DANGER')
      .setEmoji('🔒')
  );

  await interaction.update({ components: [] });
  await channel.send({ 
    content: `${user}`,
    embeds: [embed], 
    components: [row] 
  });
}

async function handleDeleteTicket(interaction, client) {
  const channel = interaction.channel;
  
  const transcript = await createTranscript(channel, {
    limit: -1,
    returnType: 'buffer',
    filename: `${channel.name}.html`,
    saveImages: true,
    poweredBy: false
  });

  const attachment = new MessageAttachment(transcript, `${channel.name}.html`);

  const logChannel = client.channels.cache.get(client.config.logsTicket);
  if (logChannel) {
    const logEmbed = new MessageEmbed()
      .setColor('#e74c3c')
      .setTitle('Ticket Deleted')
      .setDescription(`**Ticket**: ${channel.name}\n**Deleted by**: ${interaction.user.tag}`)
      .setTimestamp();

    await logChannel.send({ 
      embeds: [logEmbed], 
      files: [attachment] 
    });
  }

  await interaction.reply('Deleting ticket in 5 seconds...');
  setTimeout(() => channel.delete().catch(console.error), 5000);
}