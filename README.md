# SAPF Extension for VS Code

WIP. Contributions welcome. I'm a typescript novice.

This relies on the much-appreciated https://github.com/vasilymilovidov/sapf-lsp for the LSP.

Based on the excellent supercollider VS Code extension: https://github.com/scztt/vscode-supercollider

However, unlike the VS Code extension, interaction with sapf is done via the terminal. So you can use the commands
provided by this extension to execute code, but you can also simply switch to the terminal and type commands directly. 

Please give feedback if you would prefer it to not interact directly with your terminal, and we can switch it to a more "controlled"
approach!

## Features

1. Connect to the sapf-lsp for highlighting, autocompletion, etc... see https://github.com/vasilymilovidov/sapf-lsp for what features are supported (they should work mostly
"automatically" in VS Code).
2. Interact with sapf via terminal (evaluate code, start, stop, etc...)

## Setup
1. Download the .vsix file from the latest release: https://github.com/chairbender/vscode-sapf/releases
1. Install the extension in vscode (from the command palette: "Extensions: Install from VSIX...")
1. Follow insructions at https://github.com/vasilymilovidov/sapf-lsp to build the LSP
1. Make sure sapf-lsp is on your PATH (if you use `cargo install --path .` to build the above repo, I think that should work).
1. Make sure the sapf executable is also on your PATH.
1. If you had to change your PATH variable, you may need to restart VSCode to pick up the change.
1. Extension will apply when file ends in .sapf or can be chosen manually via VSCode (bottom right).
1. Bring up the command palette and type "sapf" to see available commands and their keybinds.

## Usage

Default keybinds are similar to supercollider defaults.

sapf-lsp and an sapf terminal will start when opening an sapf file for the first time in a session.
This can be changed in settings. The lsp is completely independent of the sapf process - it doesn't care whether
sapf is running or not.

The extension doesn't know whether sapf is running in the terminal. Or what output was provided. It can only send commands. So it doesn't make
any assumptions wheter sapf is running or not other than when it first creates the terminal window. If you manually quit out of 
sapf, or it crashes, you will need to restart it yourself (you can use the "start sapf" command or manually start it via
the sapf terminal). On the plus side, this means you are also free to type into the SAPF repl directly.

Open the command palette and type "sapf" for available commands / keybinds.

## Development

1. Clone repository:

    ```
    git clone --recursive https://github.com/chairbender/vscode-sapf.git
    cd vscode-sapf
    ```
2. Install npm dependencies:

    ```
    npm install
    ```

3. Follow setup steps above to ensure you have sapf-lsp and sapf executables on your PATH.

## Design Notes

The first iteration of this used the output window (similar to vscode-supercollider). However, I found it was difficult
to make this work reliably in a cross-platform way, because sapf behaves differently on different systems when connected via
pipe. We would have to use node-pty to work around that, which brings some complexity due to incompatibilities with
certain electron versions (but not impossible - branch fix-os shows how it can potentially be done in a cross-platform way
if desired in the future). 

Also, it prevents directly typing into the REPL if desired. So, I opted
to simply just send commands to the terminal.

If this proves to be annoying or inconvenient, we can switch to the node-pty approach or even make it configurable which
approach is used instead!
