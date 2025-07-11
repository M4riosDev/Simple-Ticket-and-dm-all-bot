module.exports = {
  name: 'remove',
  description: 'Remove someone from the ticket',
  usage: '<@user|userID>',
  async execute(message, args, client) {
    if (!message.member.roles.cache.has(client.config.supportRole)) {
      return message.reply(`❌ You need the <@&${client.config.supportRole}> role!`);
    }
    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('❌ Please mention a user or provide a valid user ID!');

    try {
      await message.channel.permissionOverwrites.delete(user.id);
      return message.reply(`✅ Successfully removed ${user.tag} from this channel.`);
    } catch (error) {
      console.error('Ticket Remove Error:', error);
      return message.reply('❌ Failed to remove user.');
    }
  },
};
