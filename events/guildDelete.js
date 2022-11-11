import { Events } from "discord.js";

// `guildDelete` event is emitted upon a bot being booted from a guild
// TODO: add functionality, if needed
export const guildDelete = {
  name: Events.GuildDelete,
  async execute(guild) {
    console.log(`Left guild: ${guild}`);
  },
};
