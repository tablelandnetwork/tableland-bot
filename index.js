import dotenv from "dotenv";
// import express from "express";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { parse, read, rigsStats } from "./commands/index.js";
import { ready, interactionCreate } from "./events/index.js";
import initSqlParser from "@tableland/sqlparser";
dotenv.config();

// const app = express();
// Initialize `@tableland/sqlparser` module (adds `sqlparser` object to global namespace)
(async () => await initSqlParser())();

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Initialize & set commands
client.commands = new Collection();
client.commands.set(read.data.name, read);
client.commands.set(parse.data.name, parse);
client.commands.set(rigsStats.data.name, rigsStats);

// When the client is ready, run this code (only once)
client.once(ready.name, (...args) => ready.execute(...args));

// Create an event listener
client.on(interactionCreate.name, (...args) => {
  interactionCreate.execute(...args);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
