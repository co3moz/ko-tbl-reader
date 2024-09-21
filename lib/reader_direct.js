const fse = require("fs-extra");
const decryption = require("../decryption");
const parser = require("./parser");
const { autoTBLFormatDetector } = require("./tbl_format_detector");
const path = require("path");

module.exports = async function readerDirect(file, korean) {
  let buffer;

  try {
    buffer = await fse.readFile(file);
  } catch (e) {
    console.error(`${e.stack}`);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  let [result, out_buffer] = await decryption(buffer);

  let { rows, rowCount, columns, columnCount } = await parser(
    out_buffer,
    korean
  );

  const detector = autoTBLFormatDetector(columns);

  console.log(
    JSON.stringify({
      file: path.basename(file),
      encryption: result,
      columnCount,
      columns: columns.map((x) => typeResolve(x)),
      rowCount,
      rows,
      detector,
    })
  );
};

function typeResolve(n) {
  switch (n) {
    case 1:
      return "byte";
    case 2:
      return "ubyte";
    case 3:
      return "short";
    case 4:
      return "ushort";
    case 5:
      return "int";
    case 6:
      return "uint";
    case 7:
      return "str";
    case 8:
      return "float";
    case 9:
      return "double";
    case 10:
      return "long";
    case 11:
      return "ulong";
  }
}
