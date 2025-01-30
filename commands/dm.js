const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Στέλνει προσωπικό μήνυμα σε χρήστη ή όλους τους χρήστες.')
    .addStringOption(option =>
      option.setName('target')
        .setDescription('Ο στόχος: "all" για όλους ή το όνομα χρήστη.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Το μήνυμα που θα σταλεί.')
        .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'Δεν έχετε δικαιώματα να χρησιμοποιήσετε αυτή την εντολή.', ephemeral: true });
    }

    const target = interaction.options.getString('target');
    const messageContent = interaction.options.getString('message');

    await interaction.deferReply({ ephemeral: true });

    if (target === 'all') {
      const members = await interaction.guild.members.fetch();
      const totalMembers = members.filter(member => !member.user.bot).size;
      let successCount = 0;
      let failureCount = 0;
      let processedCount = 0;

      const progressEmbed = new MessageEmbed()
        .setColor('#00FF00')
        .setTitle('Αποστολή DM σε εξέλιξη...')
        .setDescription('🔄 Αποστολή μηνυμάτων...')
        .addField('✅ Επιτυχίες', successCount.toString(), true)
        .addField('❌ Αποτυχίες', failureCount.toString(), true)
        .addField('📊 Πρόοδος', `${processedCount}/${totalMembers}`, false)
        .setTimestamp();

      await interaction.editReply({ embeds: [progressEmbed] });

      for (const member of members.values()) {
        if (!member.user.bot) {
          try {
            await member.send(messageContent);
            successCount++;
          } catch {
            failureCount++;
          }
          processedCount++;

          progressEmbed.fields[0].value = successCount.toString();
          progressEmbed.fields[1].value = failureCount.toString();
          progressEmbed.fields[2].value = `${processedCount}/${totalMembers}`;
          try {
            await interaction.editReply({ embeds: [progressEmbed] });
          } catch {
            console.warn('Failed to edit progress message.');
          }

          await new Promise(res => setTimeout(res, 1000));
        }
      }

      progressEmbed
        .setTitle('✅ Η αποστολή ολοκληρώθηκε!')
        .setDescription('')
        .setTimestamp();

      return interaction.editReply({ embeds: [progressEmbed] });
    } else {
      const user = interaction.guild.members.cache.find(member => member.user.username === target && !member.user.bot)?.user;
      if (!user) {
        return interaction.editReply({ content: 'Δεν βρέθηκε ο χρήστης με το συγκεκριμένο όνομα.' });
      }

      try {
        await user.send(messageContent);
        return interaction.editReply({ content: `Το DM στάλθηκε επιτυχώς στον ${user.tag}.` });
      } catch {
        return interaction.editReply({ content: `Απέτυχα να στείλω το μήνυμα στον ${user.tag}.` });
      }
    }
  },
};
