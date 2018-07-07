exports.decode = (buffer, x1, x2, x3) => {
  let key1 = x1 | 0x0816;
  let key2 = (x2 | 0x6081);
  let key3 = (x3 | 0x1608);

  for (let i = 0; i < buffer.length; i++) {
    let data = buffer[i];
    let out = data ^ (key1 >> 8);
    key1 = ((data + key1) * key2 + key3) & 0xFFFF;
    buffer[i] = out;
  }

  return buffer;
}

exports.determine = (buffer, temp) => {
  let v = 0x0816;
  let max = buffer.length;

  for (let i = 0; i < max; i++) {
    let data = buffer[i];
    let out = data ^ (v >> 8);
    v = ((data + v) * 0x6081 + 0x1608) & 0xFFFF;
    temp[i] = out;

    if (i == 3) {
      let amount = temp.readInt32LE(0);

      if (amount > 1000 || amount < 1) return false; // we do not accept 1000+ columns
      max = amount * 4 + 4;

    } else if (i % 4 == 0 && i != 0 && i != 4) {
      let headerType = temp.readInt32LE(i - 4);

      if (headerType > 11 || headerType < 0) {
        return false; // invalid header type
      }
    }
  }

  return true;
}
