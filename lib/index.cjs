"use strict";

const fse = require("fs/promises");
const path = require("path");
const decryption = require("./decryption/index.cjs");
const { parse } = require("./parser.cjs");
const { typeName } = require("./header.cjs");
const { autoTBLFormatDetector } = require("./tbl_format_detector.cjs");

module.exports = async function readerDirect(file, korean) {
  const buffer = await fse.readFile(file);
  const [encryption, decrypted] = await decryption(buffer);
  const table = parse(decrypted, korean);
  const detector = autoTBLFormatDetector(table.columns);

  return {
    file: path.basename(file),
    encryption: encryption,
    columnCount: table.columnCount,
    columns: table.columns.map(typeName),
    rowCount: table.rowCount,
    rows: table.rows,
    endOffset: table.endOffset,
    padding: table.padding,
    detector: detector,
  }
};
