# SAPF Extension for VS Code

## Features

1. Connect to the sapf-lsp for highlighting, autocompletion, etc... see https://github.com/vasilymilovidov/sapf-lsp for what features are supported (they should work mostly
"automatically" in VS Code).
2. Interact with sapf (evaluate code, start, stop, etc...)


## Setup

1. Follow insructions at https://github.com/vasilymilovidov/sapf-lsp to build the LSP
1. Make sure LSP is on your PATH (if you use `cargo install --path .` to build the above repo, I think that should work).
1. Make sure the sapf executable is also on your PATH.
1. If your PATH changed, you may need to restart VSCode to pick up the change.
1. Extension will apply when file ends in .sapf or can be chosen manually via VSCode (bottom right).