"use strict";

/**
 * CN3TableBase layout, shared by the parser and the encryption detection.
 *
 *   i32 columnCount
 *   i32 dataType[columnCount]      (TBL_DATA_TYPE, 1..9)
 *   i32 rowCount
 *   rowCount * columnCount values, packed in row order (no padding):
 *     DT_CHAR   i8
 *     DT_BYTE   u8
 *     DT_SHORT  i16
 *     DT_WORD   u16
 *     DT_INT    i32
 *     DT_DWORD  u32
 *     DT_STRING i32 length + raw bytes
 *     DT_FLOAT  f32
 *     DT_DOUBLE f64
 *
 * The client's writer packs the rows in column order? No: it writes one row
 * after the other, each column in turn (N3TableBaseImpl::Load).
 */

const DT = {
  NONE: 0,
  CHAR: 1,
  BYTE: 2,
  SHORT: 3,
  WORD: 4,
  INT: 5,
  DWORD: 6,
  STRING: 7,
  FLOAT: 8,
  DOUBLE: 9,
};

const TYPE_NAMES = {
  [DT.CHAR]: "byte",
  [DT.BYTE]: "ubyte",
  [DT.SHORT]: "short",
  [DT.WORD]: "ushort",
  [DT.INT]: "int",
  [DT.DWORD]: "uint",
  [DT.STRING]: "str",
  [DT.FLOAT]: "float",
  [DT.DOUBLE]: "double",
};

/** Sanity limits; a wrong decryption key never gets past these. */
const MAX_COLUMNS = 1000;
const MAX_ROWS = 2000000;
const MAX_STRING_LENGTH = 200000;

function typeName(type) {
  return TYPE_NAMES[type] || "unknown(" + type + ")";
}

function valueSize(type) {
  switch (type) {
    case DT.CHAR:
    case DT.BYTE:
      return 1;
    case DT.SHORT:
    case DT.WORD:
      return 2;
    case DT.INT:
    case DT.DWORD:
    case DT.FLOAT:
      return 4;
    case DT.DOUBLE:
      return 8;
    default:
      return -1; // DT_STRING, variable length
  }
}

function readValue(buffer, type, offset) {
  switch (type) {
    case DT.CHAR:
      return buffer.readInt8(offset);
    case DT.BYTE:
      return buffer.readUInt8(offset);
    case DT.SHORT:
      return buffer.readInt16LE(offset);
    case DT.WORD:
      return buffer.readUInt16LE(offset);
    case DT.INT:
      return buffer.readInt32LE(offset);
    case DT.DWORD:
      return buffer.readUInt32LE(offset);
    case DT.FLOAT:
      return buffer.readFloatLE(offset);
    case DT.DOUBLE:
      return buffer.readDoubleLE(offset);
    default:
      throw new Error("unsupported column type " + type);
  }
}

function readHeader(buffer, offset) {
  offset = offset || 0;

  if (offset + 4 > buffer.length) {
    throw new Error("truncated table header");
  }

  const columnCount = buffer.readInt32LE(offset);
  if (columnCount < 1 || columnCount > MAX_COLUMNS) {
    throw new Error("invalid column count " + columnCount);
  }

  const columnsOffset = offset + 4;
  const rowsOffset = columnsOffset + columnCount * 4;
  if (rowsOffset + 4 > buffer.length) {
    throw new Error("truncated column type list");
  }

  const columns = new Array(columnCount);
  for (let i = 0; i < columnCount; i++) {
    const type = buffer.readInt32LE(columnsOffset + i * 4);
    if (type < DT.CHAR || type > DT.DOUBLE) {
      throw new Error("invalid column type " + type + " at index " + i);
    }
    columns[i] = type;
  }

  const rowCount = buffer.readInt32LE(rowsOffset);
  if (rowCount < 0 || rowCount > MAX_ROWS) {
    throw new Error("invalid row count " + rowCount);
  }

  return {
    columnCount: columnCount,
    columns: columns,
    rowCount: rowCount,
    dataOffset: rowsOffset + 4,
  };
}

/**
 * Walks the records. With { collect: true } the values are materialised into
 * rows and strings are passed through decodeString (a Buffer -> string fn).
 */
function walk(buffer, offset, options) {
  const opts = options || {};
  const header = readHeader(buffer, offset || 0);
  const columns = header.columns;
  const rows = opts.collect ? [] : null;
  const decodeString = opts.decodeString;
  let o = header.dataOffset;

  for (let r = 0; r < header.rowCount; r++) {
    const row = rows ? new Array(header.columnCount) : null;

    for (let c = 0; c < header.columnCount; c++) {
      const type = columns[c];
      let value;

      if (type === DT.STRING) {
        if (o + 4 > buffer.length) {
          throw new Error("truncated string length (row " + r + ", column " + c + ")");
        }
        const length = buffer.readInt32LE(o);
        o += 4;
        if (length < 0 || length > MAX_STRING_LENGTH) {
          throw new Error("invalid string length " + length + " (row " + r + ", column " + c + ")");
        }
        if (o + length > buffer.length) {
          throw new Error("truncated string (row " + r + ", column " + c + ")");
        }
        if (row) {
          const raw = buffer.subarray(o, o + length);
          value = decodeString ? decodeString(raw) : Buffer.from(raw);
        }
        o += length;
      } else {
        const size = valueSize(type);
        if (o + size > buffer.length) {
          throw new Error("truncated value (row " + r + ", column " + c + ")");
        }
        if (row) {
          value = readValue(buffer, type, o);
        }
        o += size;
      }

      if (row) {
        row[c] = value;
      }
    }

    if (rows) {
      rows.push(row);
    }
  }

  return {
    columnCount: header.columnCount,
    columns: columns,
    rowCount: header.rowCount,
    dataOffset: header.dataOffset,
    endOffset: o,
    rows: rows,
  };
}

/**
 * Returns the table info when the buffer holds a complete table at offset,
 * allowing at most padding trailing bytes; otherwise null.
 */
function isTable(buffer, offset, padding) {
  try {
    const info = walk(buffer, offset || 0, null);
    const tail = buffer.length - info.endOffset;
    if (tail < 0 || tail > (padding || 0)) {
      return null;
    }
    return info;
  } catch (e) {
    return null;
  }
}

module.exports = {
  DT: DT,
  MAX_COLUMNS: MAX_COLUMNS,
  MAX_ROWS: MAX_ROWS,
  typeName: typeName,
  readHeader: readHeader,
  walk: walk,
  isTable: isTable,
};
