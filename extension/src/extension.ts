import * as vscode from 'vscode';

import { openViewer } from "./viewer";

import type { TableEditorFormat } from "./viewer";

export function activate(context: vscode.ExtensionContext) {

	let panel: vscode.WebviewPanel;
	
	const formats: TableEditorFormat[] = ['csv', 'html', 'md', 'json'];

	for (let format of formats) {
		context.subscriptions.push(
			vscode.commands.registerCommand(`table-editor.open${format.toUpperCase()}`, () => {
				panel = openViewer(context, format);
			})
		);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("table-editor.openBlank", () => {
			panel = openViewer(context, "");
		})
	);

}

// this method is called when your extension is deactivated
export function deactivate() {}
