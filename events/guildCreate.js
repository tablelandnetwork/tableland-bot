import { Events } from "discord.js";

// `guildCreate` event is emitted upon a new guild installs the bot
// TODO: add functionality, if needed
export const guildCreate = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`Joined a new guild: ${guild}`);
  },
};
