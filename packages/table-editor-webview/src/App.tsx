import * as React from "react";
import {
  ReactGrid,
  Column,
  Row,
  CellChange,
  HeaderCell,
  TextCell,
  Id,
  Cell,
  MenuOption,
  SelectionMode,
  CellLocation,
} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import "./App.css";
import "./column-header.css";
import { ColumnHeaderCell, ColumnHeaderCellTemplate } from "./ColumnHeader";
import { TextCellTemplate } from "./TextCellTemplate";
import Papa from "papaparse";
import {markdownTable} from 'markdown-table';
import HTMLTableToJSON from './html-table-to-json';

import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmTable} from 'micromark-extension-gfm-table'
import {gfmTableFromMarkdown} from 'mdast-util-gfm-table'

import type {
  TableCell,
  TableRow,
  Table,
} from 'mdast';

import type { 
  Root,
} from 'mdast-util-from-markdown/lib';
import { cmd, TextWidthMeasurer } from "./utils";
import CodeDialog from "./CodeDialog";
import NumRowsDialog from "./NumRowsDialog";

const STARTER_CSV = "A,B,C,D\n,,,\n,,,\n,,,\n,,,";
const textWidthMeasurer = new TextWidthMeasurer();

type TableState = { columns: Column[], records: Record[] };

type TableChange = 
  (() => void) | 
  CellChange<Cell | TableEditorCell>[] | 
  TableState;

type HistoryItem = {
  do: TableChange,
  undo: TableChange,
};

function parseMD(doc: string) {
  function _getCellData(node: TableCell) {
    return (node.children[0] as {value: string}).value;
  }
  function _getRowData(node: TableRow) {
    return node.children.map(_getCellData);
  }
  function _getTableData(node: Table) {
    return node.children.map(_getRowData);
  }
  function getData(root: Root) {
    return _getTableData(root.children[0] as Table);
  }
  const tree = fromMarkdown(doc, {
    extensions: [gfmTable],
    mdastExtensions: [gfmTableFromMarkdown]
  });
  const rows = getData(tree);
  const headers = rows[0];
  const records = (rows as string[][]).slice(1).map((row: any) => {
    const obj: any = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i];
    }
    return obj;
  });
  return { headers, records };
}

declare var acquireVsCodeApi: any;

// const acquireVsCodeApi = () => {
//   return {
//     postMessage: (message: any) => {
//       console.log(message);
//     },
//   };
// }

interface Record {
  [key: string]: string;
}

type TableEditorCell = TextCell | ColumnHeaderCell | HeaderCell;
type TableEditorRow = Row<TableEditorCell>;

type ColumnId = string;

const getRows = (
  records: Record[],
  columnsOrder: ColumnId[],
): TableEditorRow[] => {
  return [
    {
      rowId: "header",
      cells: [
        { type: "header", text: "#" },
        ...columnsOrder.map((columnId) => ({
          type: "columnHeader" as "columnHeader",
          text: columnId,
        })),
      ],
    },
    ...records.map<TableEditorRow>((record, idx) => ({
      rowId: idx,
      cells: [
        { type: "header", text: (idx + 1).toString() },
        ...columnsOrder.map((columnId) => ({
          type: "text" as "text",
          text: record[columnId] || "",
        })),
      ],
    })),
  ];
};

// a helper function used to reorder arbitrary arrays
const reorderArray = <T extends {}>(arr: T[], idxs: number[], to: number) => {
  const movedElements = arr.filter((_, idx) => idxs.includes(idx));
  const targetIdx =
    Math.min(...idxs) < to
      ? (to += 1)
      : (to -= idxs.filter((idx) => idx < to).length);
  const leftSide = arr.filter(
    (_, idx) => idx < targetIdx && !idxs.includes(idx)
  );
  const rightSide = arr.filter(
    (_, idx) => idx >= targetIdx && !idxs.includes(idx)
  );
  return [...leftSide, ...movedElements, ...rightSide];
};

function isIllegalHeaderChange(
  change: CellChange<Cell | TableEditorCell>,
  prevColumns: Column[],
) {
  if (change.newCell.type !== "columnHeader") return false;
  const newHeader = (change.newCell as ColumnHeaderCell).text;
  const isHeaderRemove = newHeader === "";
  const isDuplicatedHeader = prevColumns.map(col => col.columnId).includes(newHeader);
  return isHeaderRemove || isDuplicatedHeader;
}

const applyChanges = (
  changes: CellChange<Cell | TableEditorCell>[],
  prevColumns: Column[],
  prevRecords: Record[],
  addHistoryItem?: (item: HistoryItem) => void,
) => {
  let newRecords = [...prevRecords.map(record => ({...record}))],
      newColumns = [...prevColumns.map(col => ({...col}))];
  changes.forEach((change) => {
    if (!isIllegalHeaderChange(change, prevColumns)) {
      if (change.rowId !== "header") {
          const recordIndex = change.rowId as number;
          const fieldName = change.columnId;
          newRecords[recordIndex][fieldName] = (change.newCell as TableEditorCell).text;
      } else {
        const fieldName = change.columnId;
        const column = newColumns.find((c) => c.columnId === fieldName);
        if (column) {
          column.columnId = (change.newCell as TableEditorCell).text;
        }
        newRecords = newRecords.map((record) => {
          const newRecord = {...record};
          const value = newRecord[change.columnId];
          delete newRecord[change.columnId];
          return { ...newRecord, [(change.newCell as TableEditorCell).text]: value };
        });
      }
    }
  });
  if (addHistoryItem) {
    const undoChanges: CellChange<Cell | TableEditorCell>[] = changes.map(change => ({
      ...change,
      newCell: change.previousCell,
      previousCell: change.newCell,
    }));
    addHistoryItem({
      do: changes,
      undo: undoChanges,
    });
  }
  return {
    newRecords,
    newColumns,
  };
};

const MAX_HISTORY = 100;

function withColumnAdded(columns: Column[], records: Record[], newId: string, colIndex: number) {
  const newColumns = [
    ...columns.slice(0, colIndex),
    {
      columnId: newId,
      width: 120,
      resizable: true,
      reorderable: true,
    },
    ...columns.slice(colIndex),
  ];
  const newRecords = [
    ...records.map((record) => {
      return { ...record, [newId]: "" };
    }),
  ];
  return {
    newColumns,
    newRecords,
  }
}

function withColumnRemoved(columns: Column[], records: Record[], colIds: string[]) {
  const newRecords = [
    ...records.map((record) => {
      const newRecord = { ...record };
      for (let colId of colIds) {
        delete newRecord[colId];
      }
      return newRecord;
    }),
  ];
  const newColumns = [
    ...columns.filter(
      (column) => !(typeof column.columnId === 'string' && colIds.includes(column.columnId))
    ),
  ];
  return {
    newColumns,
    newRecords,
  };
}

function App() {
  const [records, setRecords] = React.useState<Record[]>([]);
  const [columns, setColumns] = React.useState<Column[]>([]);
  const [warning, setWarning] = React.useState(false);
  const [codeRequested, setCodeRequested] = React.useState("");
  const [numRowsRequest, setNumRowsRequest] = React.useState("");
  const [numRows, setNumRows] = React.useState("10");
  const [rowAddIndex, setRowAddIndex] = React.useState(0);
  const [code, setCode] = React.useState("");
  const [selectedColIds, setSelectedColIds] = React.useState<Id[]>([]);
  const [codeHistory, setCodeHistory] = React.useState<string[]>([]);
  const [codeHistoryIndex, setCodeHistoryIndex] = React.useState(0);
  const [undoHistory, setUndoHistory] = React.useState<HistoryItem[]>([]);
  const [redoHistory, setRedoHistory] = React.useState<HistoryItem[]>([]);

  const addHistoryItem = (item: HistoryItem, preserveRedo?: boolean) => {
    setUndoHistory(hist => [
      ...hist.slice(Math.max(0, hist.length - MAX_HISTORY + 1), hist.length),
      item
    ]);
    if (!preserveRedo) {
      setRedoHistory([]);
    }
  };

  function performHistoryAction(item: HistoryItem, action: 'do' | 'undo') {
    if (typeof (item[action]) === 'function') {
      (item[action] as Function)();
    } else if (Array.isArray(item[action])) {
      const { newColumns, newRecords } = applyChanges
        (item[action] as CellChange<TableEditorCell>[],
        columns,
        records
      );
      setTableData(newColumns, newRecords);
    } else {
      setTableData(
        (item[action] as TableState).columns,
        (item[action] as TableState).records
      );
    }
  }

  function undo() {
    const lastItem = undoHistory.pop();
    if (!lastItem) return;
    setRedoHistory(hist => [
      ...hist,
      lastItem,
    ]);
    performHistoryAction(lastItem, 'undo')
  }

  function redo() {
    const lastItem = redoHistory.pop();
    if (!lastItem) return;
    addHistoryItem(lastItem, true); // do preserve redo history
    performHistoryAction(lastItem, 'do');
  }

  function emptyRecord(): Record {
    const record: Record = {};
    for (let column of columns) {
      if (column.columnId === "_row_number") continue;
      record[column.columnId] = "";
    }
    return record;
  }

  let rows: TableEditorRow[] = [];
  try {
    rows = getRows(
      records,
      columns
        .map((c) =>
          c.columnId === "_row_number" ? "" : (c.columnId as ColumnId)
        )
        .filter(Boolean)
    );
  } catch (e) {
    setWarning(true);
  }

  const handleColumnsReorder = (targetColumnId: Id, columnIds: Id[]) => {
    const to = columns.findIndex(
      (column) => column.columnId === targetColumnId
    );
    const columnIdxs = columnIds.map((columnId) =>
      columns.findIndex((c) => c.columnId === columnId)
    );
    setColumns((prevColumns) => reorderArray(prevColumns, columnIdxs, to));
  };

  const handleColumnResize = (ci: Id, width: number) => {
    setColumns((prevColumns) => {
      const columnIndex = prevColumns.findIndex((el) => el.columnId === ci);
      const resizedColumn = prevColumns[columnIndex];
      const updatedColumn = { ...resizedColumn, width };
      prevColumns[columnIndex] = updatedColumn;
      return [...prevColumns];
    });
  };

  const handleChanges = (changes: CellChange[]) => {
    const { newRecords, newColumns } = applyChanges(
      changes,
      columns,
      records,
      addHistoryItem,
    );
    setTableData(newColumns, newRecords);
  };

  const makeColumnSpec = (c: string) => ({ 
    columnId: c, 
    width: 100, 
    resizable: true,
    reorderable: true,
  });

  function setTableData(newColumns: Column[], newRecords: Record[]) {
    if (tableDataIsValid(newColumns, newRecords)) {
      setColumns(newColumns);
      setRecords(newRecords);
      setWarning(false);
    } else {
      setWarning(true);
    }
  }

  function tableDataIsValid(columns: Column[], records: Record[]) {
    return columns.length > 0 && records.length > 0;
  }

  const importUnknown = (data: string) => {
    for (let importFormat of [importJSON, importHTML, importMD, importCSV]) {
      const result = importFormat(data);
      if (result !== false) return;
    }
    setWarning(true);
  }

  const importCSV = (csv: string) => {
    try {
      const { data, meta } = Papa.parse(csv.trim(), { header: true });
      if (!meta.fields) return;
      let newColumns = makeColumns(meta.fields)
      const newRecords = (data as Record[]).map(row => {
        const newRecord: Record = {};
        for (let field of meta.fields ?? []) {
          newRecord[field] = row[field];
        }
        return newRecord;
      });
      addHistoryItem({
        do: { columns: newColumns, records: newRecords },
        undo: { columns, records },
      });
      newColumns = autofitColumns(newColumns, newRecords);
      setTableData(newColumns, newRecords);
      return true;
    } catch (e) {
      setWarning(true);
      return false;
    }
  }

  const importMD = (md: string) => {
    try {
      const { headers, records: newRecords } = parseMD(md.trim());
      let newColumns = makeColumns(headers as string[]);
      newColumns = autofitColumns(newColumns, newRecords);
      setTableData(newColumns, newRecords);
      addHistoryItem({
        do: { columns: newColumns, records: newRecords },
        undo: { columns, records },
      });
      return true;
    } catch (err) {
      setWarning(true);
      return false;
    }
  };

  const importHTML = (html: string) => {
    try {
      const json = HTMLTableToJSON.parse(html.trim());
      const headers = [...Object.keys(json.results[0][0])];
      let newColumns = makeColumns(headers);
      const newRecords = json.results[0] as Record[];
      newColumns = autofitColumns(newColumns, newRecords);
      setTableData(newColumns, newRecords);
      addHistoryItem({
        do: { columns: newColumns, records: newRecords },
        undo: { columns, records },
      });
      return true;
    } catch (err) {
      setWarning(true);
      return false;
    }
  };

  const importJSON = (json: string) => {
    try {
      const newRecords = JSON.parse(json.trim());
      const headers = [...Object.keys(newRecords[0])];
      let newColumns = makeColumns(headers as string[]);
      newColumns = autofitColumns(newColumns, newRecords);
      setTableData(newColumns, newRecords);
      addHistoryItem({
        do: { columns: newColumns, records: newRecords },
        undo: { columns, records },
      });
      return true;
    } catch (err) {
      setWarning(true);
      return false;
    }
  };

  const makeColumns = (cols: string[]): Column[] => {
    return [
      {
        columnId: "_row_number",
        width: 50,
        resizable: true
      },
      ...cols.map(makeColumnSpec),
    ];
  }

  const vscodeRef = React.useRef<any>(null);
  if (!vscodeRef.current) {
    vscodeRef.current = acquireVsCodeApi();
  }
  const vscode = vscodeRef.current;

  const exportContent = (content: string) => {
    vscode.postMessage({
      command: "EXPORT",
      content,
    });
  }

  React.useEffect(() => {
    window.addEventListener("contextmenu", 
      (e) => e.preventDefault(),
    true);
  }, []);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { data } = event; 
      if (data.command === "LOAD_TABLE") {
        const { content } = data;
        if (data.format === "html") {
          importHTML(content);
        } else if (data.format === "csv") {
          importCSV(content);
        } else if (data.format === "md") {
          importMD(content);
        } else if (data.format === "json") {
          importJSON(content);
        } else if (data.format === "unknown") {
          importUnknown(content);
        } else if (data.format === "") {
          importCSV(STARTER_CSV);
        }
      }
    };

    window.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  const exportCSV = () => {
    const head = columns.map((c) => c.columnId).filter(id => id !== "_row_number");
    const body = records.map(record => {
      return columns.map(column => {
        if (column.columnId === "_row_number") return null;
        return record[column.columnId];
      }).filter(Boolean);
    });
    const csv = Papa.unparse({
      fields: head as string[],
      data: body,
    })
    exportContent(csv);
    // const blob = new Blob([csv], {type: "text/csv"});
    // const url = URL.createObjectURL(blob);
    // const link = document.createElement("a");
    // link.href = url;
    // link.download = "export.csv";
    // link.click();
  }

  const exportJSON = () => {
    const json = JSON.stringify(records.map(record => {
      const { id, ...rest } = record;
      return rest;
    }), null, 2);
    exportContent(json);
    // const blob = new Blob([json], {type: "application/json"});
    // const url = URL.createObjectURL(blob);
    // const link = document.createElement("a");
    // link.href = url;
    // link.download = "export.json";
    // link.click();
  }

  const exportMD = () => {
    const md = markdownTable([
      columns.slice(1).map(c => c.columnId.toString()),
      ...records.map(record => {
      return [...Object.values(record)].map(x => x.toString());
      })],
      {
        align: "",        
      });
    exportContent(md);
    // const blob = new Blob([md], {type: "text/markdown"});
    // const url = URL.createObjectURL(blob);
    // const link = document.createElement("a");
    // link.href = url;
    // link.download = "export.md";
    // link.click();
  }

  const exportHTML = () => {
    const html = `<table>
  <thead>
    <tr>
      ${columns
          .slice(1)
          .map(c => `<th>${c.columnId}</th>`)
          .join("\n      ")}
    </tr>
  </thead>
  <tbody>
    ${records.map(record => {
      return `<tr>
      ${[...Object.values(record)]
          .map(x => `<td>${x}</td>`)
          .join("\n      ")}
    </tr>`;
    }).join("\n    ")}
  </tbody>
</table>`;
    exportContent(html);
    // const blob = new Blob([html], {type: "text/html"});
    // const url = URL.createObjectURL(blob);
    // const link = document.createElement("a");
    // link.href = url;
    // link.download = "export.html";
    // link.click();
  }

  function getNewId() {
    let newId = "new column";
    let ctr = 0;
    while (true) {
      const matchingCol = columns.find((col) => 
        col.columnId === newId
      );
      if (matchingCol === undefined) break;
      newId = `new column ${++ctr}`;
    };
    return newId;
  }

  function addColumn(
    colIdx: number,
    colId?: string,
  ) {
    const addCol = () => {
      if (!colId) colId = getNewId();
      const { newColumns, newRecords } = withColumnAdded(
        columns,
        records,
        colId,
        colIdx,
      );
      setTableData(newColumns, newRecords);
    }
    const removeCol = () => {
      if (!colId) colId = getNewId();
      const { newColumns, newRecords } = withColumnRemoved(
        columns,
        records,
        [colId],
      );
      setTableData(newColumns, newRecords);
    }
    addCol();
    addHistoryItem({
      do: addCol,
      undo: removeCol,
    });
  }

  function removeColumn(selectedColIds: Id[]) {
    function removeCol() {
      const { newColumns, newRecords } = withColumnRemoved(
        columns,
        records,
        selectedColIds as string[],
      );
      setTableData(newColumns, newRecords);
    }
    removeCol();
    function restore() {
      setTableData(columns, records);
    }
    addHistoryItem({
      do: removeCol,
      undo: restore,
    });
  }

  function addRows(rowIndex: number, nRows = 1) {
    const add = () => setRecords((prevRecords) => [
      ...prevRecords.slice(0, rowIndex),
      ...Array.from({ length: nRows }).map(emptyRecord),
      ...prevRecords.slice(rowIndex),
    ]);
    add()
    addHistoryItem({
      undo: () => setRecords((prevRecords) => [
        ...prevRecords.slice(0, rowIndex),
        ...prevRecords.slice(rowIndex + nRows),
      ]),
      do: add, 
    });
  }

  function addRow(rowIndex: number) {
    addRows(rowIndex, 1)
  }

  function removeRow(rowIndexes: number[]) {
    const remove = () => setRecords((prevRecords) => [
      ...prevRecords.filter((_, i) => !rowIndexes.includes(i)),
    ]);
    remove();
    addHistoryItem({
      do: remove,
      undo: {
        columns,
        records,
      }
    });
  }

  const autofitColumns = (columns: Column[], records: Record[]) => {
    const colWidths = new Map();
    const headerRow = Object.fromEntries(
      columns
        .map(col => col.columnId === "_row_number" ? "#" : col.columnId)
        .map(x => [x, x])
    );
    for (let record of [headerRow, ...records]) {
      for (let key in record) {
        colWidths.set(
          key,
          Math.max(
            colWidths.get(key) || 0,
            Math.ceil(textWidthMeasurer.measure(
              record[key].toString(),
              '13px / 19.5px -apple-system, "system-ui", sans-serif'
            )),
          ),
        );
      }
    }
    const newColumns = columns.map((col, i) => ({
      ...col,
      width: (colWidths.get(col.columnId) + 12) || col.width,
    }));
    return newColumns;
  }

  const autofit = (columns: Column[]) => {
    const colWidths = new Map();
    [...document.querySelectorAll('.rg-cell')].forEach(node => {
      const colIdx = parseInt(node.getAttribute("data-cell-colidx") || "-1");
      colWidths.set(
        colIdx,
        Math.max(
          colWidths.get(colIdx) || 0,
          Math.ceil(textWidthMeasurer.measure(
            node.textContent || "",
            window.getComputedStyle(node).font,
          )),
        ),
      );
    });
    const newColumns = columns.map((col, i) => ({
      ...col,
      width: (colWidths.get(i) + 12) || col.width,
    }));
    addHistoryItem({
      do: () => setColumns(newColumns),
      undo: () => setColumns(columns),
    });
    setColumns(newColumns);
  }

  const simpleHandleContextMenu = (
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[],
    selectedRanges: CellLocation[][],
  ): MenuOption[] => {
    menuOptions = [
      {
        id: "exportCSV",
        label: "Insert Table as CSV",
        handler: exportCSV,
      },
      {
        id: "exportMD",
        label: "Insert Table as Markdown",
        handler: exportMD,
      },
      {
        id: "exportMD",
        label: "Insert Table as HTML",
        handler: exportHTML,
      },
      {
        id: "exportJSON",
        label: "Insert Table as JSON",
        handler: exportJSON,
      },
      {
        id: "autofitColumns",
        label: "Autofit Columns",
        handler: () => autofit(columns),
      },
      ...menuOptions,
    ];
    if (selectionMode === "row") {
      const [rowIndex] = selectedRowIds.slice(-1);
      if (typeof rowIndex === 'number') {
        menuOptions = [
          {
            id: "addRowAbove",
            label: "Add Row Above",
            handler: () => addRow(rowIndex),
          },
          {
            id: "addRowBelow",
            label: "Add Row Below",
            handler: () => addRow(rowIndex + 1),
          },
          {
            id: "addRowBelow",
            label: "Add N Rows Below",
            handler: () => {
              setNumRowsRequest("Enter number of rows:");
              setRowAddIndex(rowIndex);
            },
          },
          {
            id: "removeRow",
            label: `Delete Row${selectedRowIds.length === 1 ? "" : "s"}`,
            handler: () => removeRow(selectedRowIds as number[]),
          },
          ...menuOptions,
        ];
      }
    }
    if (selectionMode === "column") {
      menuOptions = [
        {
          id: "addColumnBefore",
          label: "Add Column Left",
          handler: () => addColumn(columns.findIndex((column) => column.columnId === selectedColIds[selectedColIds.length - 1])),
        },
        {
          id: "addColumnAfter",
          label: "Add Column Right",
          handler: () => addColumn(columns.findIndex((column) => column.columnId === selectedColIds[selectedColIds.length - 1]) + 1),
        },
        {
          id: "removeColumn",
          label: `Delete Column${selectedColIds.length === 1 ? "" : "s"}`,
          handler: () => removeColumn(selectedColIds),
        },
        {
          id: "transformColumn",
          label: `Transform Column${selectedColIds.length === 1 ? "" : "s"}`,
          handler: () => {
            setCodeRequested(
              `Enter an expression to transform the selected column${selectedColIds.length === 1 ? "" : "s"}.`
            );
            setSelectedColIds(selectedColIds);
          }
        },
        ...menuOptions,
      ];
    }
    return menuOptions;
  };

  function stringify(s: string) {
    if (typeof s === 'string') return s;
    return JSON.stringify(s);
  }

  function fromString( s:
     number | 
     string |
    {[key: string]: string} |
    {[key: string]: string}[]
  ): any {
    if (typeof s === 'number') return s;
    if (Array.isArray(s)) return s.map(fromString)
    if (typeof s === 'object') {
      const obj: {[key: string]: any} = {};
      for (const key in s) {
        obj[key] = fromString(s[key]);
      }
      return obj;
    }
    try {
      return JSON.parse(s);
    } catch (e) {
      return s;
    }
  }

  function submitCode() {
    try {
      const newRecordFields: {[key: string]: string}[] = [];
      setCodeHistory((hist) => ([...hist, code]).slice(-MAX_HISTORY));
      setCodeHistoryIndex(codeHistory.length);
      const f = eval("(cell, row, index, table) => " + code);
      for (let i = 0; i < records.length; i++) {
        newRecordFields.push({});
        const record = records[i];
        for (let j = 0; j < selectedColIds.length; j++) {
          const colId = selectedColIds[j];
          newRecordFields[i][colId] = stringify(
            f(...[record[colId], record, i + 1, records].map(fromString))
          );
        }
      }
      addHistoryItem({
        do: {
          records: records.map((record, j) => ({...record, ...newRecordFields[j]})),
          columns: columns,
        },
        undo: {
          records,
          columns,
        }
      });
      setRecords(records => {
        return records.map((record, j) => ({...record, ...newRecordFields[j]}));
      });
      setCodeRequested("");
    } catch (e) {
      setCodeRequested("Error: " + e);
    }
  }

  function submitNumRows() {
    const numRowsNumber = parseInt(numRows);
    if (isNaN(numRowsNumber) || numRowsNumber < 1) {
      setNumRowsRequest("Enter a positive integer");
      return;
    }
    addRows(rowAddIndex, numRowsNumber);
    setNumRowsRequest("");
  }

  if (warning || !tableDataIsValid(columns, records)) return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-16">
      { warning
        ? <p className="text-white max-w-sm">
            Import failed. Please check that the text you selected is in the correct format. 
          </p>
        : null }
      <button 
        className="px-4 py-2 bg-gray-800 text-white rounded-md"
        onClick={() => {
        importCSV(STARTER_CSV);
        setWarning(false);
      }}>
        new table
      </button>
    </div>
  );

  return (
    <div 
      className="min-w-[100vw] min-h-[100vh] w-fit flex justify-center items-center py-8"
      onKeyDown={(e) => {
        if (cmd(e) && e.key === 'z') {
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
      }}>
      { codeRequested || numRowsRequest
        ? <div className="absolute bottom-0 left-0 w-screen h-fit flex flex-col justify-center items-center gap-4 px-8 py-4 z-10 bg-[#333]">
            { codeRequested
              ? <CodeDialog
                codeRequested={codeRequested}
                setCodeRequested={setCodeRequested}
                code={code}
                setCode={setCode}
                codeHistory={codeHistory}
                codeHistoryIndex={codeHistoryIndex}
                setCodeHistoryIndex={setCodeHistoryIndex}
                submitCode={submitCode}/>
              : null }
            { numRowsRequest
              ? <NumRowsDialog
                  numRowsRequest={numRowsRequest}
                  setNumRowsRequest={setNumRowsRequest}
                  numRows={numRows}
                  setNumRows={setNumRows}
                  submitNumRows={submitNumRows}/>
                : null }
          </div>
        : null }
      <ReactGrid
        rows={rows}
        columns={columns}
        onCellsChanged={handleChanges}
        onColumnResized={handleColumnResize}
        onColumnsReordered={handleColumnsReorder}
        enableRowSelection
        enableColumnSelection
        enableRangeSelection
        onContextMenu={simpleHandleContextMenu}
        stickyLeftColumns={1}
        stickyTopRows={1}
        customCellTemplates={{
          text: new TextCellTemplate(),
          columnHeader: new ColumnHeaderCellTemplate()
        }}
      />
    </div>
  );
}

export default App;
