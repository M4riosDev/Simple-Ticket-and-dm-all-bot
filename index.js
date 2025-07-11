const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const chalk = require('chalk');
const config = require('./config.json');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES 
  ],
});


client.discord = require('discord.js');
client.config = config;

client.commands = new Collection();         
client.prefixCommands = new Collection();  


const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  
  if (command.data) {
    client.commands.set(command.data.name, command);
  }
  
  if (command.prefixExecute) {
    client.prefixCommands.set(command.name, command);
    
    if (command.aliases) {
      command.aliases.forEach(alias => {
        client.prefixCommands.set(alias, command);
      });
    }
  }
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  client.on(event.name, (...args) => event.execute(...args, client));
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client, config);
  } catch (error) {
    console.error(chalk.red(`[ERROR] Slash Command: ${error}`));
    await interaction.reply({
      content: '❌ There was an error executing this command!',
      ephemeral: true
    });
  }
});


client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isDM = !message.guild; 

  if (isDM && config.allowDMsWithoutPrefix) {
    const args = message.content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.prefixCommands.get(commandName);

    if (command) {
      try {
        await command.prefixExecute(message, args, client, config);
      } catch (error) {
        console.error(chalk.red(`[ERROR] DM Command: ${error}`));
        await message.reply('❌ There was an error executing this command!');
      }
    }
    return;
  }

  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);

  if (!command) return;

  try {
    await command.prefixExecute(message, args, client, config);
  } catch (error) {
    console.error(chalk.red(`[ERROR] Prefix Command: ${error}`));
    await message.reply('❌ There was an error executing this command!');
  }
});

client.login(config.token)
  .then(() => console.log(chalk.green(`[STATUS] Bot logged in as ${client.user.tag}`)))
  .catch(err => console.error(chalk.red('[ERROR] Login failed:'), err));