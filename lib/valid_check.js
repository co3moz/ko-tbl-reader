module.exports = function (buffer) {
  let headerSize = buffer.readInt32LE(0);

  if (headerSize > 500) return false;

  for (let i = 0; i < headerSize && i * 4 + 8 < buffer.length; i++) {
    let headerType = buffer.readInt32LE(4 * i + 4);

    if (headerType < 1 || headerType > 8) return false;
  }

  return true;
}