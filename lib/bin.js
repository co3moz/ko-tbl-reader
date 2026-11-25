#!/usr/bin/env node

const { program } = require("commander");
const reader = require("./reader.cjs");
const reader_direct = require("./index.cjs");

program
  .version("1.1.0")
  .argument("<file>", "input file to read")
  .option("-j, --json", "gives json output")
  .option("-k, --korean", "gives korean output")
  .action(async (file, options) => {
    try {
      if (options.json) {
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
