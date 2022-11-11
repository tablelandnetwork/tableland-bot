import { SlashCommandBuilder, bold, codeBlock } from "discord.js";

// `parse` runs the Tableland `sqlparser` and checks if a query (read, write, etc.) is valid
export const parse = {
  data: new SlashCommandBuilder()
    .setName("parse")
    .setDescription("Returns whether or not a SQL statement is valid")
    .addStringOption((option) =>
      option
        .setName("statement")
        .setDescription("An attempted SQL read or mutating query")
        .setRequired(true)
    ),
  async execute(interaction) {
    let statement = await interaction.options.getString("statement");
    let result;
    let error;
    try {
      await sqlparser.normalize(statement); // eslint-disable-line no-undef
      result = true;
    } catch (err) {
      result = false;
      error = err.message;
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
    }

    await interaction.reply({
      content: result
        ? bold("Valid Tableland SQL!")
        : bold("Invalid: ") + error + codeBlock(statement),
      ephemeral: true,
    });
  },
};
