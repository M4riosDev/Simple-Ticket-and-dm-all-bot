module.exports = {
  name: 'add',
  description: 'Add someone to the ticket',
  usage: '<@user|userID>',
  async execute(message, args, client) {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('❌ This command only works in ticket channels!');
    }

    if (!message.member.roles.cache.has(client.config.supportRole)) {
      return message.reply(`❌ You need the <@&${client.config.supportRole}> role!`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('❌ Please mention a user or provide a valid ID!');

    try {
      await message.channel.permissionOverwrites.edit(user, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      return message.reply(`✅ Successfully added ${user.tag} to the ticket!`);
    } catch (error) {
      console.error('Ticket Add Error:', error);
      return message.reply('❌ Failed to add user!');
    }
  },
};