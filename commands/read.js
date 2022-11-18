import { SlashCommandBuilder, bold, codeBlock, hyperlink } from "discord.js";
import { connect, resultsToObjects, SUPPORTED_CHAINS } from "@tableland/sdk";
import findColor from "../utils/findColor.js";

/**
 * Parses a SQL read query and returns relevant info about the taable
 * @param {string} statement - A SQL read statement
 * @returns {string} tableName - Tableland table name in the form `{prefix}_{chainId}_{tableId}`
 * @returns {string} chainId - The chain ID in which the table is deployed on
 * @returns {string} tableId - The table ID
 * @returns {string} chainName - Chain in which the table was minted on
 */
async function parse(statement) {
  // The `sqlparser` will thrown an error if the statement is invalid
  const { statements, type } = await sqlparser.normalize(statement); // eslint-disable-line no-undef
  // Only allow for read queries, not writes
  if (type !== "read")
    throw new Error("Statement provided is not a read query");
  // The table's name is the first value after a "FROM" in the SELECT statement
  const tableName = statements[0].match(/FROM (\w+)/i)[1];
  // Recall a table's name: `{prefix}_{chainId}_{tableId}`
  // The last and second to last values are the `chainId` and `tableId`, separated by a `_`
  const parts = tableName.split("_");
  const chainId = parts[parts.length - 2];
  const tableId = parts[parts.length - 1];
  // Ensure the chain is supported by Tableland
  let chainName;
  for (const chain in SUPPORTED_CHAINS) {
    if (SUPPORTED_CHAINS[chain].chainId === Number(chainId)) {
      chainName = chain;
    }
  }
  if (chainName === undefined) throw new Error("Invalid chain provided");
  return { tableName, chainId, tableId, chainName };
}

/**
 * Establishes a connection to both the Tableland network and the defined chain
 * @param {string} chainName - The name of the blockchain in which the table exists on
 * @returns {Object} Connection - A Tableland SDK `Connection` object to the Tableland network
 */
async function connectTableland(chainName) {
  try {
    return await connect({ chain: chainName });
  } catch {
    throw new Error("Error connecting to Tableland");
  }
}

/**
 * Retrieves table information for the specified read SQL query
 * @param {string} statement - A SQL read statement
 * @returns {string} tableName - Tableland table name in the form `{prefix}_{chainId}_{tableId}`
 * @returns {string} chainId - The chain ID in which the table is deployed on
 * @returns {string} tableId - The table ID
 * @returns {string} chainName - Chain in which the table was minted on
 * @returns {Object} tableData - The resulting table data as an object (i.e., columns-rows as key-value pairs)
 */
async function readTableland(statement) {
  try {
    // Parse the SQL statement to then get required info for querying Tableland across any chain
    const { tableName, chainId, tableId, chainName } = await parse(statement);
    const tableland = await connectTableland(chainName);
    const readResponse = await tableland.read(statement);
    // Transform the Tableland read response data to a JSON object of key-value pairs of columns-rows
    const tableData = await resultsToObjects(readResponse);
    return { tableName, chainId, tableId, chainName, tableData };
  } catch (err) {
    throw new Error(err);
  }
}

// `read` command allows Discord members to query the Tableland network across any chain
export const read = {
  data: new SlashCommandBuilder()
    .setName("read")
    .setDescription("asdf Returns the results from a Tableland read query")
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
      // Make a read request on the Tableland table
      const { tableName, chainId, tableId, chainName, tableData } =
        await readTableland(statement);
      // For the Discord embed, form some relevant URLs that will be displayed to the user
      const encodeStatement = encodeURIComponent(statement);
      const tableSvgUrl = `https://render.tableland.xyz/${chainId}/${tableId}`;
      const gatewayQueryUrl = `https://testnet.tableland.network/query?s=${encodeStatement}`;
      const metadataUrl = `https://testnet.tableland.network/chain/${chainId}/tables/${tableId}`;
      // Make a request for the TABLE NFT's metadata
      const tableMetadata = await fetch(metadataUrl).then((response) =>
        response.json()
      );
      // Parse the TABLE metadata for its created timestamp, row count, column count, and table schema
      const createdTimestamp = tableMetadata.attributes[0].value;
      const rowCount = tableData.length;
      const columnCount = Object.keys(tableData[0]).length;
      const tableSchema = await fetch(
        `https://testnet.tableland.network/schema/${tableName}`
      ).then((res) => res.json());
      // Using logic from the TABLE NFT SVG to generate a color displayed on the embed
      const color = findColor(rowCount).toString(16);
      // Clean up the returned data for displaying it within the user-facing embed
      const tableSchemaFormatted = tableSchema.columns
        .map((column, _) => {
          const constraints = column.constraints.length
            ? `${column.constraints.join(" ")}`
            : "";
          return `${column.name} ${column.type} ${constraints}`;
        })
        .join("\n");
      // Only show the first result from the data sample and prettify it as JSON in a Discord codeblock
      const limitData = tableData.slice(0, 1)[0];
      const dataString = JSON.stringify(limitData, null, 2);
      const codeblockDataSample = codeBlock("json", dataString);
      const codeblockTableSchema = codeBlock("json", tableSchemaFormatted);
      // Crate an embedded Discord object with data data noted above
      const embedResponse = {
        color: parseInt(color, 16),
        title: "See more at the Tableland gateway",
        url: gatewayQueryUrl,
        author: {
          name: tableName,
          url: metadataUrl,
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
        timestamp: new Date().toISOString(),
        footer: {
          text: "❤️ TableBot",
          icon_url:
            "https://bafkreihrg4iddyor2ei6mxxdy6hqnjsmquzcnllvoqndfb636i5s4yinma.ipfs.nftstorage.link/",
        },
      };
      // Return the embedded response data
      await interaction.editReply({
        content:
          bold("Query: ") + codeBlock(statement) + `\n${bold("Response: ")}`,
        embeds: [embedResponse],
      });
    } catch (err) {
      // Upon an error, check if the error includes the message `syntax error at position`
      const error = err.message;
      const matchErrorPosition = error.match(
        /(?<=\bsyntax error at position\s)(\w+)/
      );
      // If so, this error will be used to visually show where the error occurred in the statement
      if (matchErrorPosition) {
        // Find the error position in the string
        const errorPosition = Number(matchErrorPosition[0]);
        // "Highlight" the character by placing a `⚠️` next to it
        const highlightCharacter = statement.charAt(errorPosition - 1) + "⚠️";
        statement = statement.replace(/./g, (c, i) =>
          i === errorPosition - 1 ? highlightCharacter : c
        );
      }
      // Return the embedded response data, showing this error position in the statement
      await interaction.editReply({
        content: bold("Invalid: ") + error + codeBlock(statement),
      });
    }
  },
};
