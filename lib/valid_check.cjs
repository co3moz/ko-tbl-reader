"use strict";

const { isTable } = require("./header.cjs");

/** True when the buffer is an unencrypted CN3TableBase table. */
module.exports = function validCheck(buffer) {
  return isTable(buffer, 0, 0) !== null;
};
