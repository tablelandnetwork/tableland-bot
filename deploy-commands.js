import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { parse, read, rigs } from "./commands/index.js";
dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Add the SlashCommandBuilder#toJSON() output of each command's data for deployment
const commands = [read.data, parse.data, rigs.data];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
