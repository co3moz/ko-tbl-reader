const fse = require("fs-extra");
const decryption = require("../decryption");
const parser = require("./parser");
const { autoTBLFormatDetector } = require("./tbl_format_detector");
const path = require("path");
const blessed = require("blessed");
const version = "v1.0.3";

/* eslint-disable no-process-exit */
module.exports = async function (file, korean) {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    terminal: "windows-ansi",
  });

  const messageBox = blessed.message({
    top: "center",
    left: "center",
    width: "shrink",
    height: "shrink",
    border: {
      type: "line",
    },
    style: {
      bg: "blue",
      fg: "white",
    },
  });

  const logHeader = `{green-bg}{white-fg}TBLReader ${version} (co3moz © MIT 2024){/}`;

  screen.append(messageBox);

  screen.key(["escape", "q", "C-c"], function () {
    return process.exit(0);
  });

  screen.title = path.basename(file);

  messageBox.log(`${logHeader}\nLoading file...`, 0);

  let buffer;

  try {
    buffer = await fse.readFile(file);
  } catch (e) {
    messageBox.log(`${logHeader}\n${e.stack}`, function () {
      process.exit(1);
    });
    return;
  }

  messageBox.log(`${logHeader}\nDecryption on progress...`, 0);
  let result, out_buffer;

  try {
    [result, out_buffer] = await decryption(buffer);
  } catch (e) {
    messageBox.log(
      `${logHeader}\nfile: ${file}\nencryption: unknown`,
      function () {
        process.exit(0);
      },
      5
    );
    return;
  }

  if (!result) {
    messageBox.log(
      `${logHeader}\nfile: ${file}\nencryption: unknown`,
      function () {
        process.exit(0);
      },
      5
    );
    return;
  }

  let { rows, rowCount, columns, columnCount } = await parser(
    out_buffer,
    korean
  );

  const detector = autoTBLFormatDetector(columns);

  let table = blessed.listtable({
    top: "center",
    align: "left",
    width: "100%",
    height: "100%",
    border: {
      type: "line",
    },
    style: {
      cell: {
        fg: "white",

        selected: {
          fg: "red",
        },
      },

      header: {
        fg: "black",
        bg: "yellow",
      },
      scrollbar: {
        bg: "red",
        fg: "blue",
      },
    },
    keyable: true,
    keys: true,
    noCellBorders: true,
    invertSelected: false,
  });

  let tableRows = rows.map((x) => x.map((x) => x.toString()));
  tableRows.unshift(
    columns.map((x, i) => {
      if (detector && detector.desc[i]) {
        return detector.desc[i];
      }

      return typeResolve(x) + "(" + i + ")";
    })
  );
  table.setRows(tableRows);
  table.on("select", function (data, index) {
    let subTable = blessed.listtable({
      top: "center",
      left: "center",

      width: "75%",
      height: "75%",
      border: {
        type: "line",
      },
      align: "left",
      style: {
        cell: {
          fg: "white",

          selected: {
            fg: "red",
          },
        },

        header: {
          fg: "white",
          bg: "red",
        },
        scrollbar: {
          bg: "red",
          fg: "blue",
        },
      },
      keyable: true,
      keys: true,
      noCellBorders: true,
      invertSelected: false,
    });

    let tableData = tableRows[index].map((x, i) => [
      (detector && detector.desc[i]) || "*" + i.toString(),
      typeResolve(columns[i]),
      x.toString(),
    ]);
    tableData.unshift(["name", "type", "value"]);
    subTable.setRows(tableData);

    subTable.focus();

    subTable.on("keypress", function (ch, key) {
      if (key.full == "enter") {
        subTable.destroy();

        screen.render();
      }
    });

    screen.append(subTable);
    screen.render();
  });

  let leftIndex = 0;
  table.on("keypress", function (ch, key) {
    if (key.full == "right" || key.full == "left") {
      if (key.full == "right") {
        leftIndex = Math.min(columnCount, leftIndex + 1);
      } else if (key.full == "left") {
        leftIndex = Math.max(0, leftIndex - 1);
      }

      let selected = table.selected;
      table.setRows(
        tableRows.map((x) => {
          let m = x.map((x) => x);
          m.splice(0, leftIndex);
          return m;
        })
      );
      table.select(selected);
      screen.render();
    }
  });

  screen.prepend(table);
  table.focus();

  messageBox.log(
    `${logHeader}\nfile: ${file}\nencryption: ${result}\ncolumns: ${columnCount}\nrows: ${rowCount}${
      detector ? `\ndetector: ${detector.file}` : ""
    }`,
    0
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
