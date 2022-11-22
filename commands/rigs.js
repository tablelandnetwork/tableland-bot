import { SlashCommandBuilder, italic } from "discord.js";
import { deployments } from "@tableland/rigs/deployments";
import { ZDK } from "@zoralabs/zdk";

// Define the Rigs contract address (on Ethereum)
const rigsContract = deployments.ethereum.contractAddress;

/**
 * Retrieves a Rig's current owner, original minting address, and metadata
 * @param {string} tokenId - Rig `tokenId` to query information about
 * @returns {string} owner - Current owner of the Rig
 * @returns {string} originalOwner - Address who originally minted the Rig
 * @returns {string} imageUrl - Image URL; IPFS published, served by NFT.Storage
 * @returns {Object} attributes - An object with keys `trait_type` and `value`
 */
async function getRigInfo(tokenId) {
  const zdk = new ZDK("https://api.zora.co/graphql");
  // Pass arguments to the unauthenticated Zora API for Rig token info
  const args = {
    token: {
      address: rigsContract,
      tokenId: tokenId.toString(),
    },
  };
  // Get the Rig token info
  let { token } = await zdk.token(args);
  token = token.token; // Response has weird nesting of `token`...semantics in the return
  // Form a Tableland read query on the Rigs attributes and lookups tables, which form Rigs metadata
  const query = `
  select 
    json_object(
      'cid', 
      renders_cid,
      'imagePath', 
      rig_id || '/' || image_thumb_name, 
      'attributes', 
      json_insert(
        (
          select 
            json_group_array(
              json_object(
                'display_type', display_type, 'trait_type', 
                trait_type, 'value', value
              )
            ) 
          from 
            ${deployments.ethereum.attributesTable}  
          where 
            rig_id = ${tokenId}
          group by 
            rig_id
        ), 
        '$[#]', 
        json_object(
          'display_type', 
          'string', 
          'trait_type', 
          'Garage Status', 
          'value', 
          coalesce(
            (
              select 
                coalesce(end_time, 'in-flight') 
              from 
                ${deployments.ethereum.pilotSessionsTable} 
              where 
                rig_id = ${tokenId}
                and end_time is null
            ), 
            'parked'
          )
        )
      )
    ) 
  from 
    ${deployments.ethereum.attributesTable}   
    join ${deployments.ethereum.lookupsTable}  
  where 
    rig_id = ${tokenId}
  group by 
    rig_id;
  `;
  // Make a request to the Tableland gateway to get Rigs metadata
  const request = await fetch(
    `https://testnet.tableland.network/query?unwrap=true&extract=true&s=${encodeURIComponent(
      query
    )}`
  ).then((data) => data.json());
  // Destructure the gateway response data for the image info and NFT `attributes`
  const { cid, imagePath, attributes } = await request;
  // Creates the an NFT.Storage gateway URL
  const imageUrl = `https://${cid}.ipfs.nftstorage.link/${imagePath}`;
  // Return the original (the one who minted) and current owner of the Rig
  return {
    owner: await token.owner,
    originalOwner: await token.mintInfo.originatorAddress,
    imageUrl,
    attributes,
  };
}

/**
 * Retrieves a Rig starting block for Flight Time Rewards purposes
 * @param {string} tokenId - Rig `tokenId` to query information about
 * @returns {number} The most recent session's starting block for flight time
 */
async function getFlightStartTime(tokenId) {
  // Make a request to the Tableland gateway to get Rig flight time data
  const query = `select start_time from ${deployments.ethereum.pilotSessionsTable} where rig_id = ${tokenId} order by id desc limit 1`;
  return await fetch(
    `https://testnet.tableland.network/query?unwrap=true&extract=true&s=${encodeURIComponent(
      query
    )}`
  ).then((data) => data.json());
}

/**
 * Returns Rigs collections stats using an unauthenticated OpenSea API call
 * @returns Object of `weekly`, `monthly`, and `total` Rigs collection stats
 */
async function getRigsCollectionStats() {
  try {
    const request = await fetch(
      "https://api.opensea.io/collection/tableland-rigs/stats"
    );
    const data = await request.json().then((data) => data.stats);
    return {
      weekly: {
        volume: data.seven_day_volume,
        change: data.seven_day_change,
        sales: data.seven_day_sales,
        price: data.seven_day_average_price,
      },
      monthly: {
        volume: data.thirty_day_volume,
        change: data.thirty_day_change,
        sales: data.thirty_day_sales,
        price: data.thirty_day_average_price,
      },
      total: {
        volume: data.total_volume,
        sales: data.total_sales,
        owners: data.num_owners,
        price: data.average_price,
        marketCap: data.market_cap,
        floor: data.floor_price,
      },
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

// `rigs` lets users retrieve collection or specific Rig information
export const rigs = {
  data: new SlashCommandBuilder()
    .setName("rigs")
    .setDescription("Look up information about Tableland Rigs")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("collection_stats")
        .setDescription("Returns Rigs collections statistics from OpenSea")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("token_info")
        .setDescription("Retrieve information about a Rig")
        .addIntegerOption((option) =>
          option
            .setName("token_id")
            .setDescription(
              "Rig token ID to retrieve info about (default: random token)"
            )
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const command = interaction.options.getSubcommand();
    let tokenId;
    switch (command) {
      case "collection_stats":
        try {
          // Retrieve the Rig collection stats via the OpenSea API
          const stats = await getRigsCollectionStats();
          if (stats === null)
            throw new Error(
              "Error fetching Rigs collection stats. Please try again."
            );
          // Create an embedded response object that shows total, weekly, and daily Rigs stats
          // All data must be converted to a string and/or properly cleansed UX purposes
          const embedResponse = {
            title: "Rigs Collection Stats",
            fields: [
              {
                name: "\u200b",
                value: italic("Summary stats & trends"),
              },
              {
                name: "Volume",
                value: stats.total.volume.toFixed(0).toString() + " ETH",
                inline: true,
              },
              {
                name: "Floor Price",
                value: stats.total.floor.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "Avg. Price",
                value: stats.total.price.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "# Sales",
                value: stats.total.sales.toString(),
                inline: true,
              },
              {
                name: "# Owners",
                value: stats.total.owners.toString(),
                inline: true,
              },
              {
                name: "Market Cap",
                value: stats.total.marketCap.toFixed(0).toString() + " ETH",
                inline: true,
              },
              {
                name: "\u200b",
                value: italic("Monthly stats & trends"),
              },
              {
                name: "Volume",
                value: stats.monthly.volume.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "Change",
                value: stats.monthly.change.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "# Sales",
                value: stats.monthly.sales.toString(),
                inline: true,
              },
              {
                name: "Avg. Price",
                value: stats.monthly.price.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "\u200b",
                value: italic("Weekly stats & trends"),
              },
              {
                name: "Volume",
                value: stats.weekly.volume.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "Change",
                value: stats.weekly.change.toFixed(2).toString() + " ETH",
                inline: true,
              },
              {
                name: "# Sales",
                value: stats.weekly.sales.toString(),
                inline: true,
              },
              {
                name: "Avg. Price",
                value: stats.weekly.price.toFixed(2).toString() + " ETH",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: "❤️ TableBot",
              icon_url:
                "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
            },
          };
          // Return the embedded response data
          await interaction.editReply({
            embeds: [embedResponse],
          });
        } catch (err) {
          console.error(err);
          await interaction.editReply({
            content: "Error fetching Rigs collection stats. Please try again.",
            ephemeral: true,
          });
        }
        break;
      case "token_info":
        tokenId = await interaction.options.getInteger("token_id");
        // If not token was provided, choose a random Rig
        if (tokenId === null) {
          // Produce a random number between 1 and 3000 -- the possible Rig token IDs
          tokenId = Math.floor(Math.random() * 3000 + 1).toString();
        }

        try {
          // Get Rig info at token ID usin Zora API (takes a string, returns current and original owner)
          const { owner, originalOwner, imageUrl, attributes } =
            await getRigInfo(tokenId);
          // Define the Rig's fleet via the metadata attributes
          const { value: fleet } = attributes.find(
            (attr) => attr.trait_type === "Fleet"
          );
          // Define the Rig's "% Original" attribute
          const { value: ogPercentage } = attributes.find(
            (attr) => attr.trait_type === "% Original"
          );
          // Define the Garage status
          const { value: garageStatus } = attributes.find(
            (attr) => attr.trait_type === "Garage Status"
          );
          // If the Rig is in-flight, get its starting block
          let flightStartTime;
          if (garageStatus === "in-flight") {
            flightStartTime = await getFlightStartTime(tokenId);
          }
          // Create an embedded response object that includes Rig attributes and image
          const embedResponse = {
            title: `Rig #${tokenId}`,
            url: `https://opensea.io/assets/ethereum/${rigsContract}/${tokenId}`,
            image: {
              url: imageUrl,
            },
            fields: [
              {
                name: "Fleet",
                value: fleet,
                inline: true,
              },
              {
                name: "OG",
                value: ogPercentage.toString() + "%",
                inline: true,
              },
              {
                name: "First Hodler?",
                value: owner === originalOwner ? "YES 🙌" : "nope 😔",
                inline: true,
              },
              {
                name: "Garage Status",
                value: garageStatus,
                inline: true,
              },
              {
                name: "Start Time",
                value:
                  flightStartTime === undefined
                    ? "N/A"
                    : await flightStartTime.toString(),
                inline: true,
              },
              {
                name: "Owner",
                value: owner,
              },
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: "❤️ TableBot",
              icon_url:
                "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
            },
          };
          // Return the embedded response data
          await interaction.editReply({
            embeds: [embedResponse],
          });
        } catch (err) {
          console.error(err);
          await interaction.editReply({
            content: "Error fetching Rig info. Please try again.",
            ephemeral: true,
          });
        }
        break;
      default:
        await interaction.editReply({
          content: "Oops, internal error with Rigs commands!",
          ephemeral: true,
        });
        break;
    }
  },
};
