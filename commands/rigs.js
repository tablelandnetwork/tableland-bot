import { SlashCommandBuilder, italic } from "discord.js";

async function getRigsStats() {
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

export const rigsStats = {
  data: new SlashCommandBuilder()
    .setName("rigs-stats")
    .setDescription("Returns Tableland Rigs collection stats"),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const stats = await getRigsStats();

      const embedResponse = {
        title: "Rigs Collection Stats",
        fields: [
          {
            name: "\u200b",
            value: italic("Total, all-time stats & trends"),
          },
          {
            name: "Volume",
            value: stats.total.volume.toFixed(2).toString() + " ETH",
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
  },
};
