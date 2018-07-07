const validCheck = require('../lib/valid_check');
const standard = require('./standard');
const double = require('./double');

module.exports = async function (buffer) {
  if (validCheck(buffer)) {
    return 'plain format';
  }

  let temp = Buffer.allocUnsafe(buffer.length); // allocate some temp
  if (standard.determine(buffer, temp)) {
    return ['standard', standard.decode(buffer)];
  }

  if (double.determine(buffer, temp)) {
    return ['double', double.decode(buffer)];
  }
}



