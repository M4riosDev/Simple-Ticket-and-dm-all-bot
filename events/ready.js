const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`${client.user.tag} is online!`);

    const ticketChannel = client.channels.cache.get(client.config.ticketChannel);

    function sendTicketMessage() {
      const embed = new MessageEmbed()
        .setColor('6d6ee8')
        .setAuthor("Ticket System", client.user.displayAvatarURL())
        .setTitle("Create a Ticket")
        .setDescription('Please select the type of ticket you need:')
        .addFields(
          { name: '🛠️ Support', value: 'General support questions', inline: true },
          { name: '⚠️ Staff Report', value: 'Report staff members', inline: true },
          { name: '💸 Refund', value: 'Request a refund', inline: true },
          { name: '👑 Owner Talk', value: 'Direct contact with owner', inline: true }
        );

      const row = new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId('ticket-type')
            .setPlaceholder('Select ticket type...')
            .addOptions([
              {
                label: 'Support',
                description: 'General support questions',
                value: 'support',
                emoji: '🛠️'
              },
              {
                label: 'Staff Report',
                description: 'Report staff members',
                value: 'staff-report',
                emoji: '⚠️'
              },
              {
                label: 'Refund Request',
                description: 'Request a refund',
                value: 'refund',
                emoji: '💸'
              },
              {
                label: 'Owner Talk',
                description: 'Direct contact with owner',
                value: 'owner',
                emoji: '👑'
              }
            ])
        );

      ticketChannel.send({ embeds: [embed], components: [row] });
    }

    ticketChannel.bulkDelete(100).then(() => sendTicketMessage());
  }
};