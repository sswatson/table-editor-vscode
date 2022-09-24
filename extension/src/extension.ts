import * as vscode from 'vscode';

import { openViewer } from "./viewer";

import type { TableEditorFormat } from "./viewer";

export function activate(context: vscode.ExtensionContext) {

	let panel: vscode.WebviewPanel;

	context.subscriptions.push(
		vscode.commands.registerCommand("table-editor.open", () => {
			panel = openViewer(context, "unknown");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("table-editor.openBlank", () => {
			panel = openViewer(context, "");
		})
	);

	const formats: TableEditorFormat[] = ['csv', 'md', 'html', 'json'];

	for (let format of formats) {
		context.subscriptions.push(
			vscode.commands.registerCommand(`table-editor.open${format.toUpperCase()}`, () => {
				panel = openViewer(context, format);
			})
		);
	}

}

// this method is called when your extension is deactivated
export function deactivate() {}
