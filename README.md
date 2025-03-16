# SAPF Extension for VS Code

WIP. Contributions welcome. I'm a typescript novice.

This relies on https://github.com/vasilymilovidov/sapf-lsp for the LSP.

Based on the excellent supercollider VS Code extension: https://github.com/scztt/vscode-supercollider

## Features

1. Connect to the sapf-lsp for highlighting, autocompletion, etc... see https://github.com/vasilymilovidov/sapf-lsp for what features are supported (they should work mostly
"automatically" in VS Code).
2. Interact with sapf (evaluate code, start, stop, etc...)

## Setup

1. Follow insructions at https://github.com/vasilymilovidov/sapf-lsp to build the LSP
1. Make sure sapf-lsp is on your PATH (if you use `cargo install --path .` to build the above repo, I think that should work).
1. Make sure the sapf executable is also on your PATH.
1. If you had to change your PATH variable, you may need to restart VSCode to pick up the change.
1. Extension will apply when file ends in .sapf or can be chosen manually via VSCode (bottom right).
1. Bring up the command palette and type "sapf" to see available commands and their keybinds.

## Usage

sapf-lsp and sapf will start when opening an sapf file for the first time in a session.
This can be changed in settings.

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