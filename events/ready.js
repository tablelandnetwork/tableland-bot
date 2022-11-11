import { Events } from "discord.js";

// `ready` event occurs upon initializing the application; only occurs once
export const ready = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Bot initialized and logged in as: ${client.user.tag}`);
  },
};
