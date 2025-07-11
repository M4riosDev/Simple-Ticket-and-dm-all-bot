module.exports = {
  name: 'add',
  description: 'Add someone to the ticket',
  usage: '<@user|userID>',
  async execute(message, args, client) {
    if (!message.member.roles.cache.has(client.config.supportRole)) {
      return message.reply(`❌ You need the <@&${client.config.supportRole}> role to use this command.`);
    }
    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('❌ Please mention a user or provide a valid user ID!');

    try {
      await message.channel.permissionOverwrites.edit(user.id, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
        READ_MESSAGE_HISTORY: true
      });

      return message.reply(`✅ Successfully added ${user.tag} to this channel.`);
    } catch (error) {
      console.error('Ticket Add Error:', error);
      return message.reply('❌ Failed to add user.');
    }
  },
};
