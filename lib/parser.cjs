"use strict";

const header = require("./header.cjs");

let eucKR = null;
if (typeof TextDecoder === "function") {
  try {
    eucKR = new TextDecoder("euc-kr");
  } catch (e) {
    eucKR = null;
  }
}

function decodeEucKR(raw) {
  return eucKR ? eucKR.decode(raw) : raw.toString("utf8");
}

function decodeUtf8(raw) {
  return raw.toString("utf8");
}

/**
 * Parses a (decrypted) CN3TableBase buffer.
 *
 * @param {Buffer} buffer
 * @param {boolean} [korean] decode strings as euc-kr instead of utf-8
 * @param {number} [offset]
 */
function parse(buffer, korean, offset) {
  const info = header.walk(buffer, offset || 0, {
    collect: true,
    decodeString: korean ? decodeEucKR : decodeUtf8,
  });

  return {
    rows: info.rows,
    columns: info.columns,
    columnCount: info.columnCount,
    rowCount: info.rowCount,
    endOffset: info.endOffset,
    padding: buffer.length - info.endOffset,
  };
}

async function parser(buffer, korean) {
  return parse(buffer, korean);
}

module.exports = parser;
module.exports.parse = parse;
module.exports.readHeader = header.readHeader;
