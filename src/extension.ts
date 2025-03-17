import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Message, ErrorHandlerResult, CloseHandlerResult, CloseAction, ErrorAction } from 'vscode-languageclient/node';
import pty from 'node-pty';
import { buffer } from 'stream/consumers';

let client: LanguageClient;
let replProcess: ChildProcessWithoutNullStreams | null = null;
let outputChannel = vscode.window.createOutputChannel("sapf");

export function activate(context: vscode.ExtensionContext) {
    const configuration = vscode.workspace.getConfiguration()

    // let serverCommand = configuration.get<string>("sapf.lsp.cmd");
    // let serverOptions: ServerOptions = {
    //     run: { command: serverCommand, options: { env: process.env}, transport: TransportKind.stdio },
    //     debug: { command: serverCommand, options: { env: process.env}, transport: TransportKind.stdio }
    // };

    // let clientOptions: LanguageClientOptions = {
    //     documentSelector: [{ scheme: 'file', language: 'sapf' }]
    // };

    // client = new LanguageClient('SapfLanguageServer', 'sapf Language Server', serverOptions, clientOptions);
    // outputChannel.show();

    // outputChannel.appendLine("Starting sapf language server...")
    // client.start();

    context.subscriptions.push(
        vscode.commands.registerCommand("sapf.start", startRepl),
        vscode.commands.registerCommand("sapf.kill", killRepl),
        vscode.commands.registerCommand("sapf.stop", sapfCommand("stop")),
        vscode.commands.registerCommand("sapf.clear", sapfCommand("clear")),
        vscode.commands.registerCommand("sapf.cleard", sapfCommand("cleard")),
        vscode.commands.registerCommand("sapf.evalBlock", evalBlock),
        vscode.commands.registerCommand("sapf.evalParagraph", evalParagraph),
        vscode.commands.registerCommand("sapf.evalLine", evalLine),
        vscode.commands.registerCommand("sapf.helpAll", sapfCommand("helpall"))
    );


    if (configuration.get<boolean>("sapf.autostart")) {
        startRepl();
    }
}

function ensureRunning(): boolean {
    if (!replProcess) {
        vscode.window.showErrorMessage("sapf is not running.");
    }
    return replProcess != null;
}

function startRepl() {
    if (replProcess) {
        vscode.window.showInformationMessage("sapf is already running.");
        return;
    }

    const configuration = vscode.workspace.getConfiguration()

    let command = "gstdbuf"; // configuration.get<string>("sapf.sapf.cmd");

    outputChannel.appendLine("Starting sapf ..." + command)
    // replProcess = spawn(command, ['-oL', 'sapf'], { env: {
    //     PATH: process.env.PATH,
    //     HOME: process.env.HOME
    // }, shell: true, cwd: process.env.HOME});
    // works, but only gets output, doesn't echo the prompt either
    //replProcess = spawn("gstdbuf", ['-oL', 'sapf'], { env: process.env, shell: true, cwd: process.env.HOME});
    replProcess = pty.spawn("sapf", [], {
        env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME 
        },
        cwd: process.env.HOME,
        cols: 80,
        rows: 30,
        name: 'xterm-color'
    });
    
    //replProcess = spawn("sapf", [], { stdio: 'overlapped', env: process.env, shell: true, cwd: process.env.HOME});
    //replProcess.stdout.pipe(process.stdout);

    replProcess.stdout.on("data", handleEvent);// (data) => outputChannel.append(data.toString()));
    replProcess.stderr.on("data", handleEvent);//outputChannel.append(data.toString()));
    //replProcess.stdin.on("data", handleEvent);
    // replProcess.stdout.on("close", (data) => handleEvent("data", data));
    // replProcess.stdout.on("data", (data) => handleEvent("data", data));
    // replProcess.stdout.on("end", (data) => handleEvent("data", data));
    // replProcess.stdout.on("error", (data) => handleEvent("data", data));
    // replProcess.stdout.on("pause", (data) => handleEvent("data", data));
    // replProcess.stdout.on("readable", (data) => handleEvent("data", data));
    // replProcess.stdout.on("resume", (data) => handleEvent("data", data));
    // replProcess.stderr.on("close", (data) => handleEvent("data", data));
    // replProcess.stderr.on("data", (data) => handleEvent("data", data));
    // replProcess.stderr.on("end", (data) => handleEvent("data", data));
    // replProcess.stderr.on("error", (data) => handleEvent("data", data));
    // replProcess.stderr.on("pause", (data) => handleEvent("data", data));
    // replProcess.stderr.on("readable", (data) => handleEvent("data", data));
    // replProcess.stderr.on("resume", (data) => handleEvent("data", data));

    replProcess.addListener("exit", () => {
        vscode.window.showInformationMessage("sapf exited.");
        replProcess = null;
    });

    outputChannel.show();
}

function handleEvent(data) {
    //console.log("Handling event: " + event + " with data: " + data);
    outputChannel.append(data.toString());
}

function killRepl() {
    if (!ensureRunning()) { return; }

    // TODO: kill on OSX not working seemingly
    if (replProcess.kill()) {
        vscode.window.showInformationMessage("sapf stopped.")
        replProcess = null;
    } else {
        vscode.window.showInformationMessage("Unable to stop sapf.")
    }
}

function sapfCommand(command: string): () => void {
    return function () {
        if (!ensureRunning()) { return; }

        replProcess.stdin.write(command + "\n");
    };
}

function requireEditor(callback: (editor: vscode.TextEditor) => void) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
    }
    callback(editor);
}

function flashRange(editor, range) {
    const evaluateDecorator = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(50, 50, 255, 0.05)",
        isWholeLine: true,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    editor.setDecorations(evaluateDecorator, [range]);

    setTimeout(() => {
        evaluateDecorator.dispose();
    }, 300);
}

function evalSelection(editor: vscode.TextEditor, selectedText: string): boolean {
    if (selectedText) {
        flashRange(editor, editor.selection);
        replProcess.stdin.write(selectedText + "\n");
        // TODO: actually wait for evaluation to complete
        return true;
    }
    return false;
}

function evalParagraph() {
    if (!ensureRunning()) { return; }
    requireEditor((editor) => {
        const selectedText = editor.document.getText(editor.selection);
        if (!evalSelection(editor, selectedText)) {
            const document = editor.document;
            const cursorPos = editor.selection.active;
            const totalLines = document.lineCount;

            let startLine = cursorPos.line;

            // Find the start of the paragraph
            while (startLine > 0 && !document.lineAt(startLine - 1).isEmptyOrWhitespace) {
                startLine--;
            }

            let endLine = startLine;
            // Find the end of the paragraph
            while (endLine < totalLines - 1 && !document.lineAt(endLine + 1).isEmptyOrWhitespace) {
                endLine++;
            }

            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
            const paragraph = document.getText(range);

            if (!paragraph.trim()) {
                vscode.window.showErrorMessage("No paragraph found.");
                return;
            }

            flashRange(editor, range);
            replProcess.stdin.write(paragraph + "\n");
        }
    });

}

function evalBlock() {
    if (!ensureRunning()) { return; }
    requireEditor((editor) => {
        const selectedText = editor.document.getText(editor.selection);
        if (!evalSelection(editor, selectedText)) {
            const document = editor.document;
            const cursorPos = editor.selection.active;
            const totalLines = document.lineCount;

            let startLine = cursorPos.line;
            let startIdx = -1;
            let endIdx = -1;

            // go backwards until we find an opening parentheses
            while (startLine > 0) {
                const openParenIdx = document.lineAt(startLine).text.lastIndexOf("(");
                if (openParenIdx != -1) {
                    startIdx = openParenIdx;
                    break;
                }
                startLine--;
            }

            if (startIdx == -1) {
                vscode.window.showErrorMessage("No opening parenthesis found.");
                return
            }

            // go forwards until we find a closing parentheses
            let endLine = startLine;
            while (endLine < totalLines) {
                const closeParenIdx = document.lineAt(endLine).text.indexOf(")");
                if (closeParenIdx != -1) {
                    endIdx = closeParenIdx;
                    break;
                }
                endLine++;
            }

            if (startIdx == -1) {
                vscode.window.showErrorMessage("No closing parenthesis found.");
                return;
            }

            const range = new vscode.Range(startLine, startIdx, endLine, endIdx + 1);
            const block = document.getText(range);

            if (!block.trim()) {
                vscode.window.showErrorMessage("No text to send.");
                return;
            }

            // Send to REPL
            flashRange(editor, range);
            replProcess.stdin.write(block + "\n");
        }
    });
}

function evalLine() {
    if (!ensureRunning()) { return; }
    requireEditor((editor) => {
        const selectedText = editor.document.getText(editor.selection);
        if (!evalSelection(editor, selectedText)) {
            const document = editor.document;
            const cursorPos = editor.selection.active;

            const line = document.lineAt(cursorPos.line).text;

            if (!line.trim()) {
                vscode.window.showErrorMessage("No text to send.");
                return;
            }

            // Send to REPL
            flashRange(editor, new vscode.Range(cursorPos.line, 0, cursorPos.line, line.length));
            replProcess.stdin.write(line + "\n");
        }
    });
}

export function deactivate(): Thenable<void> | undefined {
    return client ? client.stop() : undefined;
}