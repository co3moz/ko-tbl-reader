const reader = require("../lib/reader_direct");
const path = require("path");
const fs = require("fs");

const files = fs.readdirSync(path.resolve(__dirname, "./"));

async function main() {
  let error = 0;

  const exit = process.exit;
  process.exit = () => {};

  for (const file of files) {
    if (!file.endsWith(".tbl")) {
      continue;
    }

    try {
      await reader(path.resolve(__dirname, "./" + file), true);
    } catch (e) {
      console.error("[TEST] Failed " + file + "! " + e.stack);
      error = 1;
    }
  }

  exit(error);
}

main();
