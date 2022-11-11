import dotenv from "dotenv";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { parse, read, rigs } from "./commands/index.js";
import { ready, interactionCreate } from "./events/index.js";
import initSqlParser from "@tableland/sqlparser";
dotenv.config();

// Initialize `@tableland/sqlparser` module (adds `sqlparser` object to global namespace)
(async () => await initSqlParser())();

// Set the Discord bot token -- it will be a different bot for `production` vs. `development`
const discordToken =
  process.env.NODE_ENV === "production"
    ? process.env.DISCORD_TOKEN
    : process.env.DEVELOPMENT_DISCORD_TOKEN;

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Initialize & set commands
client.commands = new Collection();
client.commands.set(read.data.name, read);
client.commands.set(parse.data.name, parse);
client.commands.set(rigs.data.name, rigs);

// When the client is ready, run this code (only once)
client.once(ready.name, (...args) => ready.execute(...args));

// Create an event listener
client.on(interactionCreate.name, (...args) => {
  interactionCreate.execute(...args);
});

// Log in to Discord with your client's token
client.login(discordToken);
