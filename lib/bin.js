#!/usr/bin/env node

const fse = require("fs/promises");
const { program } = require("commander");
const reader = require("./reader.cjs");
const reader_direct = require("./index.cjs");
const writer = require("./writer.cjs");

function collect(value, previous) {
  return previous.concat([value]);
}

/**
 * Applies one "row.column=value" edit. row and column are 0 based (as the
 * viewer shows them); column may also be a detector name ("1.name=x").
 */
function applySet(table, expression) {
  const match = /^(\d+)\.([^=]+)=(.*)$/s.exec(expression);
  if (!match) {
    throw new Error("invalid --set " + JSON.stringify(expression) + ", expected row.column=value");
  }

  const row = Number(match[1]);
  if (row >= table.rows.length) {
    throw new Error("row " + row + " does not exist (" + table.rows.length + " rows)");
  }

  let column = match[2];
  if (/^\d+$/.test(column)) {
    column = Number(column);
  } else {
    const names = (table.detector && table.detector.desc) || [];
    const index = names.findIndex((n) => n && n.toLowerCase() === column.toLowerCase());
    if (index < 0) {
      throw new Error("unknown column " + JSON.stringify(column));
    }
    column = index;
  }
  if (column >= table.columns.length) {
    throw new Error("column " + column + " does not exist (" + table.columns.length + " columns)");
  }

  const before = table.rows[row][column];
  table.rows[row][column] = match[3];
  console.error("[" + row + "." + column + "] " + JSON.stringify(before) + " -> " + JSON.stringify(match[3]));
}

program
  .version("1.1.0")
  .argument("<file>", "input file to read (.tbl, or .json with --output)")
  .option("-j, --json", "gives json output")
  .option("-k, --korean", "gives korean output (euc-kr strings, also when writing)")
  .option("-o, --output <tbl>", "writes a tbl file from the input (json made with -j, or another tbl)")
  .option(
    "-e, --encryption <name>",
    "encryption of the written tbl: " + writer.ENCRYPTIONS.join(", ") + " (default: the input's)"
  )
  .option(
    "-s, --set <row.column=value>",
    "changes one cell (0 based, repeatable) and writes the tbl back (in place unless -o)",
    collect,
    []
  )
  .action(async (file, options) => {
    try {
      if (options.set.length && !options.output) {
        if (/\.json$/i.test(file)) {
          throw new Error("--set on a json input needs -o <tbl>");
        }
        options.output = file;
      }

      if (options.output) {
        let table;
        if (/\.json$/i.test(file)) {
          table = JSON.parse(await fse.readFile(file, "utf8"));
        } else {
          table = await reader_direct(file, options.korean);
        }

        options.set.forEach((expression) => applySet(table, expression));

        const buffer = await writer.writeTbl(options.output, table, {
          encryption: options.encryption,
          korean: options.korean,
        });
        console.error(
          "written " + options.output + " (" + (options.encryption || table.encryption || "standard") +
          ", " + table.rows.length + " rows, " + buffer.length + " bytes)"
        );
      } else if (options.json) {
        const data = await reader_direct(file, options.korean);
        console.log(JSON.stringify(data));
      } else {
        await reader(file, options.korean);
      }
    } catch (err) {
      console.error("error occurred!\n" + err.stack);
      process.exitCode = 1;
    }
  });

program.parse();
