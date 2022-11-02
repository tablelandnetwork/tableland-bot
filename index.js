import dotenv from "dotenv";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { query } from "./commands/main.js";
dotenv.config();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
// Initialize & set commands
client.commands = new Collection();
client.commands.set(query.data.name, query);

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (c) => {
  console.log(`Initialize bot: logged in as '${c.user.tag}'`);
});

// Create an event listener
client.on(Events.InteractionCreate, async (interaction) => {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
