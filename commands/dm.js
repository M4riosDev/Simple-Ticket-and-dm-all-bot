const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'dm',
  description: 'Send a direct message to a user or all users',
  usage: '<user|all> <message>',
  permissions: ['ADMINISTRATOR'],
  async prefixExecute(message, args, client) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ You need `ADMINISTRATOR` permissions!');
    }

    if (args.length < 2) {
      return message.reply(`Usage: \`${client.config.prefix}dm <user|all> <message>\``);
    }

    const target = args[0].toLowerCase();
    const msgContent = args.slice(1).join(' ');

    if (target === 'all') {
      const members = await message.guild.members.fetch();
      const nonBotMembers = members.filter(m => !m.user.bot);
      let success = 0, failed = 0;

      const progressMsg = await message.channel.send('🚀 Starting mass DM...');

      for (const [id, member] of nonBotMembers) {
        try {
          await member.send(msgContent);
          success++;
        } catch (err) {
          failed++;
        }
        if ((success + failed) % 10 === 0) {
          await progressMsg.edit(`📤 Progress: ${success + failed}/${nonBotMembers.size}\n✅ ${success} | ❌ ${failed}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2500)); 
      }

      return progressMsg.edit(`✅ Finished!\nSent to ${success} users | Failed: ${failed}`);
    }

    const user = message.mentions.users.first() || 
                await client.users.fetch(args[0]).catch(() => null);

    if (!user || user.bot) {
      return message.reply('❌ Invalid user or user is a bot!');
    }

    try {
      await user.send(msgContent);
      message.reply(`✅ DM sent to ${user.tag}`);
    } catch (err) {
      message.reply(`❌ Failed to DM ${user.tag} (DMs disabled?)`);
    }
  }
};