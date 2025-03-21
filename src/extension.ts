import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Message, ErrorHandlerResult, CloseHandlerResult, CloseAction, ErrorAction } from 'vscode-languageclient/node';

let client: LanguageClient;
let replTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {
    const configuration = vscode.workspace.getConfiguration();

    let serverCommand = configuration.get<string>("sapf.lsp.cmd");
    let serverOptions: ServerOptions = {
        run: { command: serverCommand, options: { env: { PATH: process.env.PATH, HOME: process.env.HOME } }, transport: TransportKind.stdio },
        debug: { command: serverCommand, options: { env: { PATH: process.env.PATH, HOME: process.env.HOME } }, transport: TransportKind.stdio }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sapf' }]
    };

    client = new LanguageClient('SapfLanguageServer', 'sapf Language Server', serverOptions, clientOptions);
    client.start();

    context.subscriptions.push(
        vscode.commands.registerCommand("sapf.start", startSapf),
        vscode.commands.registerCommand("sapf.quit", sapfCommand("quit")),
        vscode.commands.registerCommand("sapf.stop", sapfCommand("stop")),
        vscode.commands.registerCommand("sapf.clear", sapfCommand("clear")),
        vscode.commands.registerCommand("sapf.cleard", sapfCommand("cleard")),
        vscode.commands.registerCommand("sapf.evalBlock", evalBlock),
        vscode.commands.registerCommand("sapf.evalParagraph", evalParagraph),
        vscode.commands.registerCommand("sapf.evalLine", evalLine),
        vscode.commands.registerCommand("sapf.helpAll", sapfCommand("helpall"))
    );

    if (configuration.get<boolean>("sapf.autostart")) {
        ensureTerminal();
    }

    vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === replTerminal) {
            replTerminal = undefined;
            vscode.window.showWarningMessage("sapf terminal closed - sapf exited");
        }
    });
}

export function deactivate() {
    client?.stop();
    replTerminal?.dispose();
}

function startSapf() {
    ensureTerminal()
    const configuration = vscode.workspace.getConfiguration()
    let command = configuration.get<string>("sapf.sapf.cmd");
    replTerminal.sendText(command);
    replTerminal.show(true); // Reshow the existing terminal
}

function ensureTerminal() {
    if (!replTerminal) {
        replTerminal = vscode.window.createTerminal("sapf");
        replTerminal.show(true);

        const configuration = vscode.workspace.getConfiguration()
        let command = configuration.get<string>("sapf.sapf.cmd");
        replTerminal.sendText(command);
    } else {
        replTerminal.show(true); // Reshow the existing terminal
    }
}

function sendCodeToRepl(code: string) {
    if (!replTerminal) {
        vscode.window.showWarningMessage("REPL is not running. Launching it now...");
        ensureTerminal();
    } else {
        replTerminal.show(true); // Bring it to focus
    }

    replTerminal.sendText(code);
}

function sapfCommand(command: string): () => void {
    return function () {
        sendCodeToRepl(command);
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
        sendCodeToRepl(selectedText);
        return true;
    }
    return false;
}

function evalParagraph() {
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
            sendCodeToRepl(paragraph);
        }
    });

}

function evalBlock() {
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
            sendCodeToRepl(block);
        }
    });
}

function evalLine() {
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
            sendCodeToRepl(line);
        }
    });
}