#!/usr/bin/env node

const program = require("commander");
const reader = require("../lib/reader");
const reader_direct = require("../lib/reader_direct");

program
  .usage("[-j] <file>")
  .option("-j, --json", "gives json output")
  .option("-k, --korean", "gives korean output");

program.version("1.0.3").parse(process.argv);

if (!program.args.length) return program.help();

if (program.json) {
  reader_direct(program.args[0], program.korean).catch((err) => {
    console.error("error ocurred! \n" + err.stack);
  });
} else {
  reader(program.args[0], program.korean).catch((err) => {
    console.error("error ocurred! \n" + err.stack);
  });
}
