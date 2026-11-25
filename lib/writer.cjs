"use strict";

const fse = require("fs/promises");
const { DT, MAX_COLUMNS, MAX_ROWS } = require("./header.cjs");
const cipher = require("./decryption/cipher.cjs");
const double = require("./decryption/double.cjs");

/** Encryptions build() output can be wrapped in, as reported by the reader. */
const ENCRYPTIONS = ["plain"].concat(cipher.KEY_SETS.map((k) => k.name), ["double"]);

const TYPE_BY_NAME = {
  byte: DT.CHAR,
  char: DT.CHAR,
  ubyte: DT.BYTE,
  short: DT.SHORT,
  ushort: DT.WORD,
  word: DT.WORD,
  int: DT.INT,
  uint: DT.DWORD,
  dword: DT.DWORD,
  str: DT.STRING,
  string: DT.STRING,
  float: DT.FLOAT,
  double: DT.DOUBLE,
};

/** Accepts the reader's type names ("int", "str", ...) or the raw 1..9 ids. */
function resolveType(type, index) {
  const id = typeof type === "number" ? type : TYPE_BY_NAME[String(type).toLowerCase()];
  if (!Number.isInteger(id) || id < DT.CHAR || id > DT.DOUBLE) {
    throw new Error("unknown column type " + JSON.stringify(type) + " at index " + index);
  }
  return id;
}

let eucKREncoder = null;

/**
 * Node has no euc-kr encoder, so the table is built once from the decoder:
 * every double byte sequence that decodes to a single character.
 */
function encodeEucKR(text) {
  if (!eucKREncoder) {
    const decoder = new TextDecoder("euc-kr");
    eucKREncoder = new Map();
    // lone high bytes the decoder passes through (e.g. 0x92 -> U+0092)
    for (let b = 0x80; b <= 0xff; b++) {
      const ch = decoder.decode(Buffer.from([b]));
      if (ch.length === 1 && ch !== "�") {
        eucKREncoder.set(ch, [b]);
      }
    }
    const pair = Buffer.alloc(2);
    for (let lead = 0x81; lead <= 0xfe; lead++) {
      for (let trail = 0x41; trail <= 0xfe; trail++) {
        pair[0] = lead;
        pair[1] = trail;
        const ch = decoder.decode(pair);
        if (ch.length === 1 && ch !== "�" && !eucKREncoder.has(ch)) {
          eucKREncoder.set(ch, [lead, trail]);
        }
      }
    }
  }

  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x80) {
      bytes.push(code);
      continue;
    }
    const encoded = eucKREncoder.get(ch);
    if (!encoded) {
      throw new Error("character " + JSON.stringify(ch) + " has no euc-kr encoding");
    }
    bytes.push(...encoded);
  }
  return Buffer.from(bytes);
}

function encodeString(value, korean) {
  if (value === null || value === undefined) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  // JSON.stringify(Buffer) form
  if (typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  const text = String(value);
  return korean ? encodeEucKR(text) : Buffer.from(text, "utf8");
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error("not a number: " + JSON.stringify(value));
  }
  return n;
}

const INT_RANGES = {
  [DT.CHAR]: [-0x80, 0x7f, 1],
  [DT.BYTE]: [0, 0xff, 1],
  [DT.SHORT]: [-0x8000, 0x7fff, 2],
  [DT.WORD]: [0, 0xffff, 2],
  [DT.INT]: [-0x80000000, 0x7fffffff, 4],
  [DT.DWORD]: [0, 0xffffffff, 4],
};

function encodeNumber(type, value) {
  const n = toNumber(value);
  const range = INT_RANGES[type];
  const out = Buffer.allocUnsafe(range ? range[2] : type === DT.FLOAT ? 4 : 8);

  if (range) {
    if (!Number.isInteger(n) || n < range[0] || n > range[1]) {
      throw new Error("value " + JSON.stringify(value) + " is out of range [" + range[0] + ", " + range[1] + "]");
    }
    switch (type) {
      case DT.CHAR: out.writeInt8(n, 0); break;
      case DT.BYTE: out.writeUInt8(n, 0); break;
      case DT.SHORT: out.writeInt16LE(n, 0); break;
      case DT.WORD: out.writeUInt16LE(n, 0); break;
      case DT.INT: out.writeInt32LE(n, 0); break;
      case DT.DWORD: out.writeUInt32LE(n, 0); break;
    }
  } else if (type === DT.FLOAT) {
    out.writeFloatLE(n, 0);
  } else {
    out.writeDoubleLE(n, 0);
  }
  return out;
}

/**
 * Serialises a table into the plain CN3TableBase layout (see header.cjs).
 *
 * @param {{columns: Array<string|number>, rows: Array<Array<*>>}} table
 *   columns as the reader reports them ("int", "str", ...) or raw type ids
 * @param {{korean?: boolean}} [options] encode strings as euc-kr
 * @returns {Buffer}
 */
function build(table, options) {
  const opts = options || {};
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    throw new Error("table needs a columns and a rows array");
  }

  const columns = table.columns.map(resolveType);
  if (columns.length < 1 || columns.length > MAX_COLUMNS) {
    throw new Error("invalid column count " + columns.length);
  }
  if (table.rows.length > MAX_ROWS) {
    throw new Error("invalid row count " + table.rows.length);
  }

  const head = Buffer.alloc(8 + columns.length * 4);
  head.writeInt32LE(columns.length, 0);
  columns.forEach((type, i) => head.writeInt32LE(type, 4 + i * 4));
  head.writeInt32LE(table.rows.length, 4 + columns.length * 4);

  const parts = [head];
  table.rows.forEach((row, r) => {
    if (!Array.isArray(row) || row.length !== columns.length) {
      throw new Error("row " + r + " has " + (Array.isArray(row) ? row.length : "no") +
        " values, expected " + columns.length);
    }
    for (let c = 0; c < columns.length; c++) {
      try {
        if (columns[c] === DT.STRING) {
          const raw = encodeString(row[c], opts.korean);
          const length = Buffer.allocUnsafe(4);
          length.writeInt32LE(raw.length, 0);
          parts.push(length, raw);
        } else {
          parts.push(encodeNumber(columns[c], row[c]));
        }
      } catch (e) {
        throw new Error(e.message + " (row " + r + ", column " + c + ")");
      }
    }
  });

  return Buffer.concat(parts);
}

/**
 * Wraps plain table bytes in one of the encryptions the reader detects.
 *
 * @param {Buffer} plain output of build()
 * @param {string} encryption "plain", "standard", "standard-0418" or "double"
 * @param {{prefix?: Buffer|string}} [options] the "double" payload prefix
 *   (hex string or Buffer, the reader reports it as "prefix")
 */
function encrypt(plain, encryption, options) {
  const opts = options || {};
  if (encryption === "plain") {
    return Buffer.from(plain);
  }
  if (encryption === "double") {
    let prefix = opts.prefix;
    if (typeof prefix === "string") {
      prefix = Buffer.from(prefix, "hex");
    }
    if (prefix && prefix.length !== double.PREFIX) {
      throw new Error("double prefix must be " + double.PREFIX + " bytes");
    }
    return double.encode(plain, prefix);
  }
  const keys = cipher.keySet(encryption);
  if (!keys) {
    throw new Error("unknown encryption " + JSON.stringify(encryption) +
      ", expected one of " + ENCRYPTIONS.join(", "));
  }
  return cipher.encode(plain, keys);
}

/**
 * Builds and encrypts a .tbl in one go. table.encryption and table.prefix
 * (as produced by the reader's json output) are used unless options override.
 *
 * @param {object} table
 * @param {{encryption?: string, korean?: boolean, prefix?: Buffer|string}} [options]
 * @returns {Buffer}
 */
function toTbl(table, options) {
  const opts = options || {};
  const encryption = opts.encryption || table.encryption || "standard";
  const prefix = opts.prefix !== undefined ? opts.prefix : table.prefix;
  return encrypt(build(table, opts), encryption, { prefix: prefix });
}

/** toTbl() and write the result to file. */
async function writeTbl(file, table, options) {
  const buffer = toTbl(table, options);
  await fse.writeFile(file, buffer);
  return buffer;
}

module.exports = {
  ENCRYPTIONS: ENCRYPTIONS,
  build: build,
  encrypt: encrypt,
  toTbl: toTbl,
  writeTbl: writeTbl,
  encodeEucKR: encodeEucKR,
};
