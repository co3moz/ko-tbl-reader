#!/usr/bin/env node

const fse = require("fs/promises");
const { program } = require("commander");
const reader = require("./reader.cjs");
const reader_direct = require("./index.cjs");
const writer = require("./writer.cjs");

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
  .action(async (file, options) => {
    try {
      if (options.output) {
        let table;
        if (/\.json$/i.test(file)) {
          table = JSON.parse(await fse.readFile(file, "utf8"));
        } else {
          table = await reader_direct(file, options.korean);
        }

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
