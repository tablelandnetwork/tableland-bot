import { SlashCommandBuilder, italic } from "discord.js";
import { ZDK } from "@zoralabs/zdk";

async function getRigInfo(tokenId) {
  const zdk = new ZDK("https://api.zora.co/graphql");
  const args = {
    token: {
      address: "0x8EAa9AE1Ac89B1c8C8a8104D08C045f78Aadb42D", // Rigs contract address
      tokenId,
    },
  };
  let { token } = await zdk.token(args);
  token = token.token; // Response has weird nesting of `token`
  return {
    owner: await token.owner,
    originalOwner: await token.mintInfo.originatorAddress,
  };
}

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
    .setDescription("Returns Tableland Rigs stats (default: collection info)")
    .addStringOption((option) =>
      option
        .setName("token-id")
        .setDescription("Rig token ID to retrieve info about")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const tokenId = await interaction.options.getString("token-id");
    if (!tokenId) {
      try {
        const stats = await getRigsCollectionStats();

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

        await interaction.editReply({
          embeds: [embedResponse],
        });
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: "Error fetching Rigs stats. Please try again.",
        });
      }
    } else {
      try {
        const { owner, originalOwner } = await getRigInfo(tokenId);
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
        const request = await fetch(
          `https://testnet.tableland.network/query?unwrap=true&extract=true&s=${query}`
        ).then((data) => data.json());
        const { image, attributes } = await request;
        const ipfsPath = await image.match(/ipfs:\/\/(.*)/)[1];
        const cid = ipfsPath.match(/^[^/]*/);
        const imagePath = ipfsPath.match(/\/(.*)/)[1];
        const url = `https://${cid}.ipfs.nftstorage.link/${imagePath}`;
        const { value: fleet } = attributes.find(
          (attr) => attr.trait_type === "Fleet"
        );
        const { value: ogPercentage } = attributes.find(
          (attr) => attr.trait_type === "% Original"
        );
        const embedResponse = {
          title: `Rig #${tokenId}`,
          url: `https://opensea.io/assets/ethereum/0x8eaa9ae1ac89b1c8c8a8104d08c045f78aadb42d/${tokenId}`,
          image: {
            url,
          },
          fields: [
            {
              name: "Fleet",
              value: fleet,
              inline: true,
            },
            {
              name: "% OG",
              value: ogPercentage,
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

        await interaction.editReply({
          embeds: [embedResponse],
        });
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: "Error fetching Rigs stats. Please try again.",
        });
      }
    }
  },
};
