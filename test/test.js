"use strict";

const fs = require("fs");
const path = require("path");
const decryption = require("../lib/decryption/index.cjs");
const { parse } = require("../lib/parser.cjs");

/**
 * Every fixture with the layout it must produce. A wrong key cannot pass:
 * the whole table has to parse and end exactly at the end of the buffer.
 *
 *   encryption   detected by decryption/index.js
 *   columnCount / rowCount   from the table header
 *   cell         an optional [row, column, value] sample to prove real data
 */
const EXPECTED = {
  "help_us.tbl": { encryption: "standard", columnCount: 6, rowCount: 50 },
  "Item_Ext_1_us.tbl": { encryption: "standard", columnCount: 53, rowCount: 254 },
  "Item_Ext_21_us.tbl": { encryption: "standard", columnCount: 53, rowCount: 469 },
  "Texts_us.tbl": { encryption: "standard", columnCount: 2, rowCount: 1557 },
  "Zones.tbl": { encryption: "standard", columnCount: 24, rowCount: 44 },
  "zones1299.tbl": { encryption: "standard", columnCount: 24, rowCount: 44 },
  // 1.5xx generation (analysis/1506/Data/Zones.tbl): classic cipher, but the
  // table already has the 25 column layout that 1.705 keeps.
  "zones1505.tbl": {
    encryption: "standard",
    columnCount: 25,
    rowCount: 56,
    cell: [1, 1, "Zones\\karus2004.gtd"],
  },
  // 1.705: same cipher, new constants (0x0418 / 0x8041 / 0x1804)
  "zones1705.tbl": { encryption: "standard-0418", columnCount: 25, rowCount: 58 },
  "fx1705.tbl": { encryption: "standard-0418", columnCount: 5, rowCount: 665 },
  // 1.886 / 2.195: 20 byte header + 64 bit scramble + stream cipher
  "zones2195.tbl": {
    encryption: "double",
    columnCount: 27,
    rowCount: 87,
    cell: [0, 1, "knightonline.exe"],
  },
  "itemcrash_us1886.tbl": {
    encryption: "double",
    columnCount: 4,
    rowCount: 220,
    cell: [0, 0, 1],
  },

  "Item_Org_us.tbl": {
    encryption: "standard",
    columnCount: 37,
    rowCount: 807,
  },
};

async function main() {
  const dir = __dirname;
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".tbl"))
    .sort();

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const expected = EXPECTED[file];
    const buffer = fs.readFileSync(path.join(dir, file));

    if (!expected) {
      console.log("MISS " + file + " has no expectation, add it to EXPECTED");
      failed++;
      continue;
    }

    let encryption, table;
    try {
      let decrypted;
      [encryption, decrypted] = await decryption(buffer);
      table = parse(decrypted, true);
    } catch (e) {
      console.log("FAIL " + file + ": " + e.message);
      failed++;
      continue;
    }

    const problems = [];
    if (encryption !== expected.encryption) {
      problems.push("encryption " + encryption + " != " + expected.encryption);
    }
    if (table.columnCount !== expected.columnCount) {
      problems.push("columns " + table.columnCount + " != " + expected.columnCount);
    }
    if (table.rowCount !== expected.rowCount) {
      problems.push("rows " + table.rowCount + " != " + expected.rowCount);
    }
    if (table.padding !== 0) {
      problems.push("ends " + table.padding + " bytes before the end of the file");
    }
    if (expected.cell) {
      const [row, column, value] = expected.cell;
      const actual = table.rows[row] && table.rows[row][column];
      if (actual !== value) {
        problems.push(
          "cell [" + row + "," + column + "] is " + JSON.stringify(actual) +
          " not " + JSON.stringify(value)
        );
      }
    }

    if (problems.length) {
      console.log("FAIL " + file + ": " + problems.join(", "));
      failed++;
      continue;
    }

    passed++;
    console.log(
      "ok   " + file.padEnd(24) + " " + encryption.padEnd(15) +
      String(table.columnCount).padStart(3) + " cols " +
      String(table.rowCount).padStart(5) + " rows " +
      (buffer.length / 1024).toFixed(1) + " KB"
    );
  }

  console.log("");
  console.log(passed + " of " + (passed + failed) + " tables parsed as expected");
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
