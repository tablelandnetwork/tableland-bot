import { SlashCommandBuilder, bold, codeBlock, hyperlink } from "discord.js";
import { connect, resultsToObjects, SUPPORTED_CHAINS } from "@tableland/sdk";
import findColor from "../utils/findColor.js";

async function parse(statement) {
  const { statements, type } = await sqlparser.normalize(statement); // eslint-disable-line no-undef
  if (type !== "read")
    throw new Error("Statement provided is not a read query");
  const tableName = statements[0].match(/FROM (\w+)/i)[1];
  const parts = tableName.split("_");
  const chainId = parts[parts.length - 2];
  const tableId = parts[parts.length - 1];
  let chainName;
  for (const chain in SUPPORTED_CHAINS) {
    if (SUPPORTED_CHAINS[chain].chainId === Number(chainId)) {
      chainName = chain;
    }
  }
  if (chainName === undefined) throw new Error("Invalid chain provided");
  return { tableName, tableId, chainId, chainName };
}

async function connectTableland(chainName) {
  try {
    return await connect({ chain: chainName });
  } catch {
    throw new Error("Error connecting to Tableland");
  }
}

async function readTableland(statement) {
  try {
    const { tableName, tableId, chainId, chainName } = await parse(statement);
    const tableland = await connectTableland(chainName);
    const readResponse = await tableland.read(statement);
    const data = await resultsToObjects(readResponse);
    return { tableName, tableId, chainId, chainName, data };
  } catch (err) {
    throw new Error(err);
  }
}

export const read = {
  data: new SlashCommandBuilder()
    .setName("read")
    .setDescription("Returns the results from a Tableland read query")
    .addStringOption((option) =>
      option
        .setName("statement")
        .setDescription("A SQL compliant SELECT statement")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    let statement = await interaction.options.getString("statement");
    try {
      const { tableName, tableId, chainId, chainName, data } =
        await readTableland(statement);
      const encodeStatement = encodeURIComponent(statement);
      const tableSvgUrl = `https://render.tableland.xyz/${chainId}/${tableId}`;
      const gatewayQueryUrl = `https://testnet.tableland.network/query?s=${encodeStatement}`;
      const metadataUrl = `https://testnet.tableland.network/chain/${chainId}/tables/${tableId}`;

      const tableMetadata = await fetch(metadataUrl).then((response) =>
        response.json()
      );
      const createdTimestamp = tableMetadata.attributes[0].value;
      const rowCount = data.length;
      const columnCount = Object.keys(data[0]).length;
      const color = findColor(rowCount).toString(16);
      const tableSchema = await fetch(
        `https://testnet.tableland.network/schema/${tableName}`
      ).then((res) => res.json());

      const tableSchemaFormatted = tableSchema.columns
        .map((column, _) => {
          const constraints = column.constraints.length
            ? `${column.constraints.join(" ")}`
            : "";
          return `${column.name} ${column.type} ${constraints}`;
        })
        .join("\n");
      const limitData = data.slice(0, 1)[0];
      const dataString = JSON.stringify(limitData, null, 2);
      const codeblockDataSample = codeBlock("json", dataString);
      const codeblockTableSchema = codeBlock("json", tableSchemaFormatted);
      const embedResponse = {
        color: parseInt(color, 16),
        title: "See more at the Tableland gateway",
        url: gatewayQueryUrl,
        author: {
          name: tableName,
          icon_url:
            "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
          url: metadataUrl,
        },
        thumbnail: {
          url: "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
        },
        fields: [
          {
            name: "Data Sample",
            value: codeblockDataSample,
          },
          {
            name: "Table Schema",
            value: codeblockTableSchema,
          },
          {
            name: "# Rows",
            value: rowCount,
            inline: true,
          },
          {
            name: "# Columns",
            value: columnCount,
            inline: true,
          },
          {
            name: "Created At",
            value: `<t:${createdTimestamp}:D>`,
            inline: true,
          },
          {
            name: "Chain",
            value: SUPPORTED_CHAINS[chainName].phrase,
            inline: true,
          },
          {
            name: "\u200b",
            value: hyperlink("See the TABLE NFT", tableSvgUrl),
          },
        ],
        image: {
          url: "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
        },
        timestamp: new Date().toISOString(),
        footer: {
          text: "❤️ TableBot",
          icon_url:
            "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
        },
      };

      await interaction.editReply({
        content:
          bold("Query: ") + codeBlock(statement) + `\n${bold("Response: ")}`,
        embeds: [embedResponse],
      });
    } catch (err) {
      const error = err.message;
      const matchErrorPosition = error.match(
        /(?<=\bsyntax error at position\s)(\w+)/
      );
      if (matchErrorPosition) {
        const errorPosition = Number(matchErrorPosition[0]);
        const highlightCharacter = statement.charAt(errorPosition - 1) + "⚠️";
        statement = statement.replace(/./g, (c, i) =>
          i === errorPosition - 1 ? highlightCharacter : c
        );
      }
      await interaction.editReply({
        content: bold("Invalid: ") + error + codeBlock(statement),
      });
    }
  },
};
