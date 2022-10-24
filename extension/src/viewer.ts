import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { TextDecoder } from "util";

export type TableEditorFormat = 'csv' | 'md' | 'html' | 'json' | 'unknown';

function getSelection(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    return {
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      selection: "",
    };
  }
  const { active, anchor } = editor.selection;
  const range = new vscode.Range(active, anchor);
  const selection = editor.document.getText(range);
  return {
    range,
    selection,
  };
}

function findBlock(editor: vscode.TextEditor) {
  const { active } = editor.selection;
  let start = active.line, end = active.line;
  // search forward to find a nonempty line
  while (start < editor.document.lineCount - 1 
          && editor.document.lineAt(start).isEmptyOrWhitespace) {
    start++;
    end++;
  }
  if (start === editor.document.lineCount - 1) {
    start = active.line;
    end = active.line;
    while (start > 0
          && editor.document.lineAt(start).isEmptyOrWhitespace) {
      start--;
      end--;
    }
  }
  // if document is all whitespace:
  if (start === 0) {
    return null;
  }
  // then search backward to find the first empty line before that
  while (start > 0) {
    const line = editor.document.lineAt(start - 1);
    if (line.isEmptyOrWhitespace) {
      break;
    }
    start--;
  }
  // then search forward to find the last empty line after that
  while (end < editor.document.lineCount - 1) {
    const line = editor.document.lineAt(end + 1);
    if (line.isEmptyOrWhitespace) {
      break;
    }
    end++;
  }
  // trim fenced code block markers if necessary
  if (editor.document.lineAt(start).text.trim().startsWith('```')) {
    start++;
  }
  if (editor.document.lineAt(end).text.trim().startsWith('```')) {
    end--;
  }
  if (start >= end) {
    return null;
  }
  return new vscode.Selection(
    new vscode.Position(start, 0),
    new vscode.Position(end, editor.document.lineAt(end).text.length)
  );
}

function getSelectionOrAll(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    return "";
  };
  const { active, anchor } = editor.selection;
  if (active.line === anchor.line && active.character === anchor.character) {
    const selection = findBlock(editor);
    if (selection === null) { return ""; }
    editor.selection = selection; // actually select text; prepare for re-insertion from webview
    return editor.document.getText(selection);
  } else {
    return getSelection(editor).selection;
  }
}

export function openViewer(
  context: vscode.ExtensionContext,
  format: TableEditorFormat | "",
) {

  let panel = ReactPanel.createOrShow(context.extensionPath);

  panel.webview.postMessage({
    command: "LOAD_TABLE",
    format,
    content: format === "" ? "" : getSelectionOrAll(vscode.window.activeTextEditor),
  });

  // handle messages from the webview
  const subscription = panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "EXPORT") {
        const { content } = message;
        const [editor] = vscode.window.visibleTextEditors;
        if (editor) {
          const { range } = getSelection(editor);
          editor.edit((editBuilder) => {
            editBuilder.replace(
              range,
              content
            );
          });
        }
      } else if (message.command === "GET_PREAMBLE") {
        // get workspace folder:
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (folder) {
          const file = path.join(folder.uri.fsPath, 'table-editor.js');
          if (!fs.existsSync(file)) {
            panel.webview.postMessage({
              command: "SET_PREAMBLE",
              preamble: "",
            });
            return;
          }
          const buffer = await fs.promises.readFile(file);
          const preamble = new TextDecoder().decode(buffer);
          panel.webview.postMessage({
            command: "SET_PREAMBLE",
            preamble,
          });
        }
      }
    });

  panel.onDidDispose(() => {
    vscode.commands.executeCommand("setContext", "csvEditor.viewerOpen", false);
    subscription.dispose();
  });

  return panel;
}

/** Manages react webview panels */
export class ReactPanel {
  /** Track the currently panel. Only allow a single panel to exist at a time. */
  public static currentPanel: ReactPanel | undefined;

  private static readonly viewType = "react";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    // Otherwise, create a new panel.
    if (ReactPanel.currentPanel) {
      ReactPanel.currentPanel._panel.reveal();
    } else {
      ReactPanel.currentPanel = new ReactPanel(
        extensionPath,
        vscode.ViewColumn.Two || column
      );
    }

    return ReactPanel.currentPanel._panel;
  }

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    this._extensionPath = extensionPath;

    // Create and show a new webview panel
    this._panel = vscode.window.createWebviewPanel(
      ReactPanel.viewType,
      "Table Editor",
      column,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this._extensionPath, "build")),
        ],
        retainContextWhenHidden: true,
      }
    );

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

  }

  public dispose() {
    ReactPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview() {

    const scriptPathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "build", "index.js")
    );
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });
    const stylePathOnDisk = vscode.Uri.file(
      path.join(this._extensionPath, "build", "index.css")
    );
    const styleUri = stylePathOnDisk.with({ scheme: "vscode-resource" });

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    // font-src 'self' data: is in the secruity policy because of the AgGrid icon fonts
    // img-src * blob: data:; is in the secruity policy because of Graphviz

    return `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                  <meta name="theme-color" content="#000000">
                  <title>React App</title>
                  <link rel="stylesheet" type="text/css" href="${styleUri}">
                  <meta http-equiv="Content-Security-Policy" content="img-src  * blob: data: vscode-resource: https:; script-src 'nonce-${nonce}' 'unsafe-eval'; font-src 'self' data:; style-src vscode-resource: 'unsafe-inline' http: https: data:;">
                  <base href="${vscode.Uri.file(
                    path.join(this._extensionPath, "build")
                  ).with({ scheme: "vscode-resource" })}/">
              </head>

              <body>
                  <noscript>You need to enable JavaScript to run this app.</noscript>
                  <div id="root"></div>

                  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
              </body>
              </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
