const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const config = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(config.token);

(async () => {
  try {
    console.log('Refreshing slash commands for all guilds...');
    const applicationCommands = new Map();

    const guilds = await rest.get(Routes.userGuilds());
    for (const guild of guilds) {
      console.log(`Checking commands for guild: ${guild.name} (${guild.id})`);

      try {
        const existingCommands = await rest.get(
          Routes.applicationGuildCommands(config.clientId, guild.id)
        );
        applicationCommands.set(guild.id, existingCommands.map(cmd => cmd.name));
        const missingCommands = commands.filter(cmd =>
          !applicationCommands.get(guild.id).includes(cmd.name)
        );

        if (missingCommands.length > 0) {
          console.log(`Adding ${missingCommands.length} missing commands to guild: ${guild.name}`);
          await rest.put(
            Routes.applicationGuildCommands(config.clientId, guild.id),
            { body: commands }
          );
          console.log(`Commands successfully synced for ${guild.name}`);
        } else {
          console.log(`No missing commands for guild: ${guild.name}`);
        }
      } catch (error) {
        console.error(`Error checking/updating commands for guild: ${guild.name} (${guild.id})`);
        console.error(error);
      }
    }

    console.log('Successfully refreshed slash commands for all guilds.');
  } catch (error) {
    console.error('Failed to refresh slash commands globally.');
    console.error(error);
  }
})();
