"use strict";

const { isTable } = require("../header.cjs");
const validCheck = require("../valid_check.cjs");
const cipher = require("./cipher.cjs");
const double = require("./double.cjs");

/** Trailing bytes a payload may carry because it is padded to 8 byte blocks. */
const PADDING = 7;

/**
 * Detects the encryption of a .tbl file and returns the decrypted table.
 *
 * A candidate only wins when the *complete* table parses and ends at (or
 * within PADDING bytes of) the end of the buffer, so a wrong key cannot be
 * reported as a match.
 *
 * @param {Buffer} buffer
 * @returns {Promise<[string, Buffer, object]>} [encryption name, decrypted
 *   table, extra info needed to write it back ({ prefix } for "double")]
 */
async function decryption(buffer) {
  // Unencrypted tables (some tools and early clients ship them as-is).
  if (validCheck(buffer)) {
    return ["plain", buffer, {}];
  }

  // Stream cipher, one pass.
  for (const keys of cipher.KEY_SETS) {
    const out = cipher.decode(buffer, keys);
    if (isTable(out, 0, PADDING)) {
      return [keys.name, out, {}];
    }
  }

  // 20 byte header + 64 bit scramble + stream cipher (1.886, 2.195, ...).
  if (double.looksLike(buffer)) {
    const payload = double.decodePayload(buffer);
    // The payload starts with a short prefix in front of the table header;
    // try the observed value first, then every other plausible shift.
    const shifts = [double.PREFIX, 0, 1, 2, 3, 4, 6, 7, 8];
    for (const shift of shifts) {
      const out = payload.subarray(shift);
      if (isTable(out, 0, PADDING)) {
        return ["double", out, { prefix: payload.subarray(0, shift) }];
      }
    }
  }

  throw new Error("unknown table encryption");
}

module.exports = decryption;
module.exports.PADDING = PADDING;
