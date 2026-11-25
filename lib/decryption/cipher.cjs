"use strict";

/**
 * The CN3TableBase stream cipher (N3TableBaseImpl::LoadFromFile):
 *
 *   plain = cipher ^ (key >> 8);
 *   key   = (cipher + key) * c1 + c2;        // 16 bit, the *cipher* byte feeds it
 *
 * The constants changed between client generations; the algorithm did not.
 */
const KEY_SETS = [
  // 1.0xx .. 1.4xx (e.g. the 1.098 and 1.453 data sets)
  { name: "standard", r: 0x0816, c1: 0x6081, c2: 0x1608 },
  // 1.5xx .. 1.7xx (confirmed on the 1.705 tables; same code, new constants)
  { name: "standard-0418", r: 0x0418, c1: 0x8041, c2: 0x1804 },
];

/**
 * Returns a new buffer; the input is never modified.
 *
 * @param {Buffer} buffer
 * @param {{r:number,c1:number,c2:number}} keys
 */
function decode(buffer, keys) {
  const out = Buffer.allocUnsafe(buffer.length);
  let key = keys.r;

  for (let i = 0; i < buffer.length; i++) {
    const cipherByte = buffer[i];
    out[i] = cipherByte ^ (key >> 8);
    key = ((cipherByte + key) * keys.c1 + keys.c2) & 0xffff;
  }

  return out;
}

module.exports = {
  KEY_SETS: KEY_SETS,
  decode: decode,
};
