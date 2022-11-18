# Tableland Bot

> A Discord bot that interacts with and provides information about Tableland.

# Table of Contents

- [Table of Contents](#table-of-contents)
- [Background](#background)
- [Usage](#usage)
- [Install](#install)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

# Background

The Tableland Discord bot allows Discord memebers to query Tableland table data, check SQL validity, view information about the Rigs NFT, plus, a number of other useful commands. It is built with [`discord.js`](https://discord.js.org/#/), [`@tableland/sdk`](https://github.com/tablelandnetwork/js-tableland), and [`@tableland/wasm-sqlparser`](https://github.com/tablelandnetwork/wasm-sqlparser) where various slash commands provide the associated data.

# Usage

The following commands are available:

- `/read <statement>` => Make a read query (i.e., `SELECT` statments, only) to the Tableland network across any chain.
- `/parse <statement>` => Check any SQL statement (creates, read, & writes) for Tableland SQL compliance.
- `/rigs collection_stats` => Retrieve information about the Tableland Rigs NFT collection (floor price, volume, etc.).
- `/rigs token_info <token_id>` => Retrieve information about a single Tableland Rig NFT (image, owner, metadata, etc.).

# Install

If you'd like to use the Tableland Bot, install it by visiting the following link and enabling it for your server: [here](https://discord.com/oauth2/authorize?client_id=1037090205624172654&permissions=2147503104&scope=bot%20applications.commands). The bot requires the following access:

- Read messages
- Send messages
- Embed links
- Use application commands

# Development

For those looking to build _their own_ Discord bot, use this project as a starting point and add your own functionality.

## Configuration

1. Create a Discord developer application: [here](https://discord.com/developers)
2. Create a bot -- you'll need to reset the token and save this value (`DISCORD_TOKEN`), along with the application ID (`CLIENT_ID`) in a `.env` file.
3. For development purposes, it's helpful to have a second application that _only_ installs commands for a single development server. Duplicate the steps in (2) but saves these values with a `DEVELOPMENT_` prefix.
4. Create an OAuth2 link using the _URL Generator_ section. First choose the _bot_ and _application.commands_ scopes; then, select _Read Messages_, _Send Messages_, _Embed Links_, and _Use Slash Commands_ -- paste this link into your browser to install it in a Discord server.
5. If you set up a development-only application (where commands are only installed on a single server), go to the Discord server where you'll be devloping, and the go to _Server Settings_ > _Widget_ > _Server ID_ -- save this value in the `.env.` as `DEVELOPMENT_GUILD_ID`.

## Setup

1. Clone this repo: `git clone https://github.com/tablelandnetwork/tableland-bot`
2. Install packages: `npm install`
3. Update the `.env` file, if you haven't already (see `.env.example`)
4. For devleopment, run `npm run dev` to start the server, and run `npm run deploy:development` to install the commands (only on the dev server).
5. For production, run `npm run start` to start the server, and run `npm run deploy:production` to install the commands (on all servers).

# Contributing

PRs accepted.

# License

MIT AND Apache-2.0, © 2021-2022 Tableland Network Contributors
