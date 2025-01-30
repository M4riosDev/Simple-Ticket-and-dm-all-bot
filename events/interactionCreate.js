const { PrivateBinClient, getPasteUrl } = require('@agc93/privatebin');
const sqlite3 = require('sqlite3').verbose();
const chalk = require('chalk');
const db = new sqlite3.Database('./support.db', (err) => {
  if (err) console.error(chalk.red(`[DB ERROR]: ${err.message}`));
  else console.log(chalk.green('[DB] Connected to SQLite database.'));
});
db.run(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "open-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);

      const existingTicket = guild.channels.cache.find(c => c.topic === interaction.user.id);

      if (existingTicket) {
        return interaction.reply({
          content: 'You already have an open ticket!',
          ephemeral: true,
        });
      }

      db.get("SELECT COUNT(*) as count FROM tickets", (err, row) => {
        if (err) {
          console.error(chalk.red(`[DB ERROR]: ${err.message}`));
          return interaction.reply({
            content: 'An error occurred while creating your ticket.',
            ephemeral: true,
          });
        }

        const ticketCount = (row?.count || 0) + 1;
        const ticketName = `ticket-${ticketCount.toString().padStart(3, '0')}`;

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
              id: guild.roles.everyone,
              deny: ['VIEW_CHANNEL'],
            },
          ],
          type: "GUILD_TEXT",
        }).then(async (channel) => {ν
          db.run(
            "INSERT INTO tickets (user_id, channel_name) VALUES (?, ?)",
            [interaction.user.id, ticketName],
            (err) => {
              if (err) console.error(chalk.red(`[DB ERROR]: ${err.message}`));
            }
          );

          interaction.reply({
            content: `Ticket created! <#${channel.id}>`,
            ephemeral: true,
          });

          const embed = new client.discord.MessageEmbed()
            .setColor('6d6ee8')
            .setAuthor({ name: `${interaction.user.username}'s Ticket` })
            .setDescription('Support will assist you shortly.')
            .setTimestamp();

          const row = new client.discord.MessageActionRow()
            .addComponents(
              new client.discord.MessageButton()
                .setCustomId('close-ticket')
                .setLabel('Close')
                .setEmoji('✖')
                .setStyle('DANGER'),
            );

          await channel.send({
            content: `<@!${interaction.user.id}>`,
            embeds: [embed],
            components: [row],
          });
        });
      });
    }

    if (interaction.customId === "close-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const channel = guild.channels.cache.get(interaction.channelId);

      const row = new client.discord.MessageActionRow()
        .addComponents(
          new client.discord.MessageButton()
            .setCustomId('confirm-close')
            .setLabel('Close')
            .setStyle('DANGER'),
          new client.discord.MessageButton()
            .setCustomId('no')
            .setLabel('Cancel')
            .setStyle('SECONDARY'),
        );

      const confirmMessage = await interaction.reply({
        content: 'Are you sure you want to close the ticket?',
        components: [row],
        ephemeral: true,
        fetchReply: true,
      });

      const collector = confirmMessage.createMessageComponentCollector({
        componentType: 'BUTTON',
        time: 10000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'confirm-close') {
          await interaction.editReply({
            content: `Ticket closed by <@!${interaction.user.id}>`,
            components: [],
          });

          channel.edit({
            name: `closed-${channel.name}`,
            permissionOverwrites: [
              {
                id: client.users.cache.get(channel.topic),
                deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
              },
              {
                id: client.config.roleSupport,
                allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
              },
              {
                id: guild.roles.everyone,
                deny: ['VIEW_CHANNEL'],
              },
            ],
          });

          const embed = new client.discord.MessageEmbed()
            .setColor('6d6ee8')
            .setAuthor({ name: 'Ticket' })
            .setDescription('This ticket has been closed.')
            .setTimestamp();

          const deleteRow = new client.discord.MessageActionRow()
            .addComponents(
              new client.discord.MessageButton()
                .setCustomId('delete-ticket')
                .setLabel('Delete')
                .setEmoji('🗑️')
                .setStyle('DANGER'),
            );

          await channel.send({
            embeds: [embed],
            components: [deleteRow],
          });
        }

        if (i.customId === 'no') {
          await interaction.editReply({
            content: 'Ticket closure canceled.',
            components: [],
          });
        }

        collector.stop();
      });
    }

    if (interaction.customId === "delete-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const channel = guild.channels.cache.get(interaction.channelId);

      interaction.reply({ content: 'Saving messages...' });

      channel.messages.fetch().then(async (messages) => {
        const logContent = messages
          .filter(m => !m.author.bot)
          .map(m =>
            `${new Date(m.createdTimestamp).toLocaleString('en-EN')} - ${m.author.tag}: ${m.content}`
          )
          .reverse()
          .join('\n') || 'No messages in this ticket.';

        const pasteClient = new PrivateBinClient('https://privatebin.net/');
        const pasteResult = await pasteClient.uploadContent(logContent, { uploadFormat: 'markdown' });

        const logEmbed = new client.discord.MessageEmbed()
          .setAuthor({ name: 'Ticket Logs' })
          .setDescription(`Logs for ticket \`${channel.name}\`: [**View Logs**](${getPasteUrl(pasteResult)})`)
          .setColor('2f3136')
          .setTimestamp();

        client.channels.cache.get(client.config.logsTicket)?.send({ embeds: [logEmbed] });
        channel.send('Deleting ticket in 5 seconds...');

        setTimeout(() => channel.delete(), 5000);
      });
    }
  },
};
