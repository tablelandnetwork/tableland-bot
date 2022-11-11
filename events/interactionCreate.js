import { Events } from "discord.js";

// Interactions are the messages received when a user uses an application command or message component
export const interactionCreate = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Do not proceed if the interaction is not a chat input
    if (!interaction.isChatInputCommand()) return;
    // Get the command name, which is set in the `client` as part of the root `index.js`
    const command = interaction.client.commands.get(interaction.commandName);

    // Throw an error if there are no matching registered commands
    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    // Execute the command, which all contain a key of `execute()` that takes the interaction data and processes it thereafter
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  },
};
