const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Εμφανίζει πληροφορίες για το bot.'),
  async execute(interaction) {
    const { client } = interaction;

    const uptime = formatUptime(client.uptime);
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalServers = client.guilds.cache.size;

    const embed = new MessageEmbed()
      .setColor('#00b0f4')
      .setTitle('🤖 Πληροφορίες Bot')
      .addField('⏱️ Uptime', uptime, true)
      .addField('👥 Χρήστες', totalUsers.toString(), true)
      .addField('🖥️ Servers', totalServers.toString(), true)
      .setFooter({ text: 'Made by m4r1os' })
      .setTimestamp();

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setLabel('🔗 GitHub')
        .setStyle('LINK')
        .setURL('https://github.com/M4riosDev/Simple-Ticket-and-dm-all-bot')
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  },
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
