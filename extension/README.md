# Table Editor

This extension provides support for editing CSV, Markdown, HTML or JSON tables in a spreadsheet interface.

<img width="550" src="/extension/assets/demo.png">

## Workflow

In any text file, select a block of text representing a CSV, Markdown, HTML, or JSON table and invoke the "Open in Table Editor" command using the command palette or the keyboard shortcut ctrl+shift+t (⌘+shift+t on Mac). If no text is selected, the smallest block delimited by empty lines and containing the cursor will be selected and used.

The format of the selected table will be inferred, but if you can also use a more specific command like "Open CSV in Table Editor" from the command palette.

The table will be displayed as a spreadsheet in a new tab. You can use the spreadsheet tool to add or delete rows or columns, change column order, edit the contents of cells, and more.

When you are done editing, you can save the table back to the original file by right-clicking on the table and and selecting "Insert Table as CSV" (or Markdown, HTML, or JSON). The new contents will replace whatever text is selected in the text editor.

## Spreadsheet Features

### Basics

To add or delete a column, click a column header and then right-click to bring up a menu with the options "Add Column Before", "Add Column After", and "Delete Column". You can change the order of columns by first clicking on a column header to select it and then drag-and-drop.

To add or delete rows, click on a row number and then right-click to bring up a menu with the options "Add Row Before", "Add Row After", "Delete Row", and "Add N Rows".

To autosize the column widths to the cell contents, right-click on any cell and select "Autofit Columns".

### Column transformations

<img width="550" src="/extension/assets/demo-transform.png">

The "Transform Column" feature in the column menu allows you to write code to transform the contents of a column. For example, to put quotation marks around the contents of each cell, you can submit this code:

```javascript
"\"" + value + "\""
```
The available variables are `cell`, `index`, `row`, `table`, and `previous`.

The feature works by appending the code you supply to the text `(cell, index, row, table, previous) => ` and then evaluating the resulting expression to obtain a (Javascript) function. This function is applied to each cell in the selected column or columns and the value returned by the function is used to replace the cell's contents. You have access to [dayjs](https://day.js.org/) as `dayjs` and to [lodash](https://lodash.com/) as `_`.

The formula is not stored in the cell; if you need to edit your formula, do ⌘-Z or ctrl-Z to undo the transformation and select "Transform Column" again. The formula editor stores the history of formulas you've submitted during the current session. You can also define functions for re-use in a file called `table-editor.js` in the root of your project (that is, the root of the folder you have open in your editor). The contents of that file are prepended to the function string mentioned above.

*Examples*.

* To fill a column with successive dates starting from 01 January 2022:

    ```javascript
    // in table-editor.js: 
    function addOneDay(day) {
      return day === undefined ? "2022-01-01" : dayjs(day).add(1, "day").format("YYYY-MM-DD");
    }

    // in the formula editor:
    addOneDay(previous)
    ```

* To fill a column with random numbers between 0 and 1:

    ```javascript
    // in the formula editor:
    Math.random()
    ```

* To define a column to be the sum of two other columns `A` and `B`:

    ```javascript
    // in the formula editor:
    row.A + row.B
    ```