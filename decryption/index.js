const validCheck = require("../lib/valid_check");
const standard = require("./standard");
// const double = require("./double");

async function decryption(buffer) {
  let temp = Buffer.allocUnsafe(buffer.length); // allocate some temp

  if (standard.determine(buffer, temp)) {
    return ["standard", standard.decode(buffer)];
  }

  if (validCheck(buffer)) {
    return "plain format";
  }

  // if (double.determine(buffer, temp)) {
  //   return ["double", double.decode(buffer)];
  // }
  return [];
}

module.exports = decryption;
