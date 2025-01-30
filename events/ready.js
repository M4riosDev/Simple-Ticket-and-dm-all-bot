const chalk = require('chalk');

module.exports = {
  name: 'ready',
  execute(client) {
    console.log(chalk.green('Bot Status: ') + chalk.cyan('Initialized'));

    const ticketChannel = client.channels.cache.get(client.config.ticketChannel);

    function sendTicketMessage() {
      const embed = new client.discord.MessageEmbed()
        .setColor('6d6ee8')
        .setAuthor(" Project", client.user.avatarURL())
        .setTitle("Ticket | Επικοινωνήστε μαζί μας")
        .setDescription('Για να ανοίξετε ένα ticket πατήστε το 🎫, θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατόν.');

      const row = new client.discord.MessageActionRow()
        .addComponents(
          new client.discord.MessageButton()
            .setCustomId('open-ticket')
            .setEmoji('🎫')
            .setStyle('PRIMARY'),
        );

      ticketChannel.send({
        embeds: [embed],
        components: [row],
      });
    }

    ticketChannel.bulkDelete(100).then(sendTicketMessage);
  },
};