import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;
let replProcess: ChildProcessWithoutNullStreams | null = null;
let outputChannel = vscode.window.createOutputChannel("sapf");

export function activate(context: vscode.ExtensionContext) {
    // TODO: we need to log what's happening to a special output
    let serverCommand = 'sapf-lsp';
    let serverOptions: ServerOptions = {
        run: { command: serverCommand, options: { env: { PATH: process.env.path }}, transport: TransportKind.stdio },
        debug: { command: serverCommand, options: { env: { PATH: process.env.path }}, transport: TransportKind.stdio }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sapf' }]
    };

    // TODO: auto switch to output channel?

    client = new LanguageClient('SapfLanguageServer', 'sapf Language Server', serverOptions, clientOptions);
    outputChannel.show();

    outputChannel.appendLine("Starting sapf language server...")
    client.start();
    outputChannel.appendLine("Started sapf language server.")


    context.subscriptions.push(
        vscode.commands.registerCommand("sapf.start", startRepl), 
        vscode.commands.registerCommand("sapf.kill", killRepl),
        vscode.commands.registerCommand("sapf.stop", sapfStop),
        vscode.commands.registerCommand("sapf.clear", sapfClear),
        vscode.commands.registerCommand("sapf.cleard", sapfCleard),
        // evals block or current selection
        vscode.commands.registerCommand("sapf.evalBlock", evalBlock),
        // eval line or current selection
        vscode.commands.registerCommand("sapf.evalLine", evalLine),
        vscode.commands.registerCommand("sapf.helpWord", helpWord),
        vscode.commands.registerCommand("sapf.helpAll", helpAll)
    );

}

function startRepl() {
    if (replProcess) {
        vscode.window.showInformationMessage("sapf is already running.");
        return;
    }

    replProcess = spawn("sapf", [], { env: { PATH: process.env.PATH }, shell: true });

    replProcess.stdout.on("data", (data) => outputChannel.append(data.toString()));
    replProcess.stderr.on("data", (data) => outputChannel.append(data.toString()));

    replProcess.on("exit", () => {
        vscode.window.showInformationMessage("sapf exited.");
        replProcess = null;
    });

    outputChannel.show();
}

function killRepl() {
    if (!replProcess) {
        vscode.window.showInformationMessage("sapf is not running.");
        return;
    }

    outputChannel.appendLine("Stopping sapf...")
    if (replProcess.kill()) {
        outputChannel.appendLine("sapf stopped.")
    } else {
        outputChannel.appendLine("Unable to stop sapf.")
    }

    outputChannel.show();
}

function sendToRepl() {
    if (!replProcess) {
        vscode.window.showErrorMessage("sapf is not running.");
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText) {
        vscode.window.showErrorMessage("No text selected.");
        return;
    }

    replProcess.stdin.write(selectedText + "\n");
}

export function deactivate(): Thenable<void> | undefined {
    return client ? client.stop() : undefined;
}