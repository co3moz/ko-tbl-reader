"use strict";

const cipher = require("./cipher.cjs");
const { isTable } = require("../lib/header");

const CLASSIC = cipher.KEY_SETS[0];

/**
 * Classic (1.0xx .. 1.4xx) stream cipher.
 *
 * @param {Buffer} buffer
 * @param {number} [x1] optional extra key bits (kept for compatibility)
 * @param {number} [x2]
 * @param {number} [x3]
 */
exports.decode = function standardDecode(buffer, x1, x2, x3) {
  return cipher.decode(buffer, {
    r: (x1 | CLASSIC.r) & 0xffff,
    c1: (x2 | CLASSIC.c1) & 0xffff,
    c2: (x3 | CLASSIC.c2) & 0xffff,
  });
};

/**
 * @param {Buffer} buffer
 * @param {Buffer} [temp] receives the decrypted bytes when it fits
 */
exports.determine = function standardDetermine(buffer, temp) {
  let out;
  try {
    out = exports.decode(buffer);
  } catch (e) {
    return false;
  }

  if (temp && temp.length >= out.length) {
    out.copy(temp);
  }

  return isTable(out, 0, 0) !== null;
};
