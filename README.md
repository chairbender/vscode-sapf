# SAPF Extension for VS Code

WIP. Contributions welcome. I'm a typescript novice.

This relies on https://github.com/vasilymilovidov/sapf-lsp for the LSP.

Based on the excellent supercollider VS Code extension: https://github.com/scztt/vscode-supercollider

## Features

1. Connect to the sapf-lsp for highlighting, autocompletion, etc... see https://github.com/vasilymilovidov/sapf-lsp for what features are supported (they should work mostly
"automatically" in VS Code).
2. Interact with sapf (evaluate code, start, stop, etc...)

## Setup
1. Download the .vsix file from the latest release: https://github.com/chairbender/vscode-sapf/releases
1. Install the extension in vscode (from the command palette: "Extensions: Install from VSIX...")
1. Follow insructions at https://github.com/vasilymilovidov/sapf-lsp to build the LSP
1. Make sure sapf-lsp is on your PATH (if you use `cargo install --path .` to build the above repo, I think that should work).
1. Make sure the sapf executable is also on your PATH.
1. If you had to change your PATH variable, you may need to restart VSCode to pick up the change.
1. Extension will apply when file ends in .sapf or can be chosen manually via VSCode (bottom right).
    - ATTOW you may get an error popup "Request textDocument/semanticTokens/range failed.". You can ignore it. Working on it...
1. Bring up the command palette and type "sapf" to see available commands and their keybinds.

## Usage

sapf-lsp and sapf will start when opening an sapf file for the first time in a session.
This can be changed in settings.

Open the command palette and type "sapf" for available commands / keybinds.

## Known Issues

Getting "Request textDocument/semanticTokens/range failed" popup when first launching: https://github.com/vasilymilovidov/sapf-lsp/issues/1

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
3. Rebuild for electron compatibility (with vscode's version of electron's embedded node version).
    ```
    ./node_modules/.bin/electron-rebuild
    ```
3. You need to remember to run the above any time you modify dependencies.
3. Follow "Setup" steps above to ensure you have sapf-lsp and sapf executables on your PATH.

### Explanation of electron dependencies
(since we can't have comments in the package.json AFAIK...)
This is to explain why we have electron as a devDependency...

The sapf program doesn't work the same on OSX (probably also Linux, haven't checked yet) vs.
Windows. Specifically with
how it works when being used in an actual TTY terminal vs. being spawned as a child process in node (afaik it's
connected via a pipe in this situation on Linux/OSX).

On Windows, it works just fine using it via terminal or using child_process.spawn and using stdout/stdin, etc...not sure
 exactly why but probably has to do with how windows terminals work or the readline dependency.

On OSX/Linux, when you use child_process.spawn, I think there are 2 issues. It works just fine and you can send it commands,
but you will get 0 output from it using the same approach as with Windows. Part of it I think is buffering 
(if you run it via stdbuf, you actually start getting stdout, but you won't see your inputs or the
prompt). The other part is probably sapf / library it uses behaving differently when connected to a TTY vs pipe.

To get around this, you need to make it pretend it's connected to a TTY. That's where node-pty (a pseudo-terminal or "PTY") comes in.

But node-pty doesn't "just work" after installing it. You'll get runtime exception that it's compiled against a different version
of node. This is because VS Code is built with a certain version of Electron, which is in turn built on a certain version of Node.
NOT your native system's node (the one you installed yourself for development). SOME (not all) dependencies don't work in that situation.

To fix this, we need to first add the version of Electron that ships with current VSCode (and who knows if it breaks in
the future), then add the electron-rebuild dependency. This lets us then run electron-rebuild, which ensures node-pty is rebuilt
to be compatible with VS Code's Electron's embedded node version. We then need to run electron-rebuild anytime we encounter dependencies
that have this issue. We might also need to re-run it when VS Code updates its embedded electron version...not sure.

TODO: There might be additional issues related to prebuilt binaries to look into however...

