import { SlashCommandBuilder, italic } from "discord.js";
import { ZDK } from "@zoralabs/zdk";

/**
 * Retrieves a Rig's current owner, original minting address, and metadata
 * @param {string} tokenId Rig `tokenId` to query information about
 * @returns {string} owner - Current owner of the Rig
 * @returns {string} originalOwner - Address who originally minted the Rig
 * @returns {string} image - IPFS CID
 * @returns {Object} attributes - An object with keys `trait_type` and `value`
 */
async function getRigInfo(tokenId) {
  const zdk = new ZDK("https://api.zora.co/graphql");
  // Pass arguments to the Zora API for Rig token info
  const args = {
    token: {
      address: "0x8EAa9AE1Ac89B1c8C8a8104D08C045f78Aadb42D", // Rigs contract address
      tokenId: tokenId.toString(),
    },
  };
  // Get the Rig token info
  let { token } = await zdk.token(args);
  token = token.token; // Response has weird nesting of `token`...semantics in the return
  // Form a Tableland read query on the Rigs `rig_attributes_5_27` and `rigs_5_28` tables
  const query = `
    select 
      json_object(
        'image', 
        image, 
        'attributes', 
        json_group_array(
          json_object(
            'display_type', display_type, 'trait_type', 
            trait_type, 'value', value
          )
        )
      ) 
    from 
      rigs_5_28 
      join rig_attributes_5_27 on rigs_5_28.id = rig_attributes_5_27.rig_id 
    where 
      id = ${tokenId}
    group by 
      id
  `;
  // Make a request to the Tableland gateway to get Rigs metadata
  const request = await fetch(
    `https://testnet.tableland.network/query?unwrap=true&extract=true&s=${query}`
  ).then((data) => data.json());
  // Destructure the gateway response data for the `image` and `attributes`
  const { image, attributes } = await request;
  // Need to build a string at an IPFS gateway for image loading in Discord
  // Parsing a response value that looks like `ipfs://{cid}/{tokenId}/image.png`
  const ipfsPath = await image.match(/ipfs:\/\/(.*)/)[1];
  // Grabs just the IPFS CID
  const cid = ipfsPath.match(/^[^/]*/);
  // Grabs the `{tokenId}/image.png`
  const imagePath = ipfsPath.match(/\/(.*)/)[1];
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
 * Retruns Rigs collections stats using an unauthenticated OpenSea API call
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

    if (interaction.options.getSubcommand() === "collection_stats") {
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
              value: italic("All-time stats & trends"),
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
        });
      }
    } else if (interaction.options.getSubcommand() === "token_info") {
      let tokenId = await interaction.options.getInteger("token_id");
      // If not token was provided, choose a random Rig
      if (tokenId === null) {
        // Produce a random number between 1 and 3000 -- the possible Rig token IDs
        tokenId = Math.floor(Math.random() * 3000 + 1).toString();
      }

      try {
        // Get Rig info at token ID usin Zora API (takes a string, returns current and original owner)
        const { owner, originalOwner, imageUrl, attributes } = await getRigInfo(
          tokenId
        );
        // Define the Rig's fleet via the metadata attributes
        const { value: fleet } = attributes.find(
          (attr) => attr.trait_type === "Fleet"
        );
        // Define the Rig's "% Original" attribute
        const { value: ogPercentage } = attributes.find(
          (attr) => attr.trait_type === "% Original"
        );
        // Create an embedded response object that includes Rig attributes and image
        const embedResponse = {
          title: `Rig #${tokenId}`,
          url: `https://opensea.io/assets/ethereum/0x8eaa9ae1ac89b1c8c8a8104d08c045f78aadb42d/${tokenId}`,
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
        });
      }
    } else {
      await interaction.editReply({
        content: "Oops, internal error with Rigs commands!",
      });
    }
  },
};
