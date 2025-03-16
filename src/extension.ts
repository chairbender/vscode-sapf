import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    let serverCommand = 'sapf-lsp'; // Change this to the actual LSP binary path
    let serverOptions: ServerOptions = {
        run: { command: serverCommand, transport: TransportKind.stdio },
        debug: { command: serverCommand, transport: TransportKind.stdio }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sapf' }]
    };

    client = new LanguageClient('SapfLanguageServer', 'sapf Language Server', serverOptions, clientOptions);
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    return client ? client.stop() : undefined;
}