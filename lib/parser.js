module.exports = async function (buffer) {
  let offset = 0;

  let columnCount = buffer.readInt32LE(offset);
  offset += 4;

  let columns = Array(columnCount);
  let rows = [];

  for (let i = 0; i < columnCount; i++) {
    columns[i] = buffer.readInt32LE(offset);
    offset += 4;
  }

  let rowCount = buffer.readInt32LE(offset);
  offset += 4;

  let strlen;
  for (let i = 0; i < rowCount; i++) {
    let data = [];
    for (let c = 0; c < columnCount; c++) {
      switch (columns[c]) {
        case 1:
          data.push(buffer.readInt8(offset));
          offset++;
          break;
        case 2:
          data.push(buffer.readUInt8(offset));
          offset++;
          break;
        case 3:
          data.push(buffer.readInt16LE(offset));
          offset += 2;
          break;
        case 4:
          data.push(buffer.readUInt16LE(offset));
          offset += 2;
          break;
        case 5:
          data.push(buffer.readInt32LE(offset));
          offset += 4;
          break;
        case 6:
          data.push(buffer.readUInt32LE(offset));
          offset += 4;
          break;
        case 7:
          strlen = buffer.readInt32LE(offset);
          offset += 4;
          data.push(buffer.slice(offset, offset + strlen).toString('utf-8'));
          offset += strlen;
          break;
        case 8:
          data.push(buffer.readFloatLE(offset));
          offset += 4;
          break;
        case 9:
          data.push(buffer.readDoubleLE(offset));
          offset += 8;
          break;
        case 10:
        case 11:
          data.push([buffer.readInt32LE(offset), buffer.readInt32LE(offset + 4)]);
          offset += 8;
          break;
      }
    }

    rows.push(data);
  }

  return {
    rows, columns, columnCount, rowCount
  }
}