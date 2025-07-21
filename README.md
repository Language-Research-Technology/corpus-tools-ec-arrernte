# corpus-tools-ec-arrernte

Corpus Tools for creating an OCFL repository for Eastern Central Arrernte dictionary recordings.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Language-Research-Technology/corpus-tools-ec-arrernte.git
cd corpus-tools-ec-arrernte
npm install
```

## Usage

You can run the main corpus tool using the provided Makefile:

```bash
make
```

You can override the incldued makefile to include your data location such as:

```bash
#!/usr/bin/env bash

make BASE_DATA_DIR=/opt/storage/ECArrernte \
 TEMPLATE_DIR=/opt/storage/ECArrernte \
 REPO_OUT_DIR=/opt/storage/oni/ocfl \
 REPO_SCRATCH_DIR=/opt/storage/oni/scratch-ocfl \
 BASE_TMP_DIR=./storage/temp \
 NAMESPACE=ec-arrernte-dictionary-recordings \
 CORPUS_NAME=ec-arrernte-dictionary-recordings \
 DATA_DIR="/opt/storage/ECArrernte/DICTIONARY RECORDINGS TRANSCRIBED ETC/" \
 REPO_NAME=LDaCA \
 DEBUG=true
```

Or directly with Node.js:

```bash
node index.js -s ec-arrernte-dictionary-recordings \
  -t "./template" \
  -c ec-arrernte-dictionary-recordings -n LDaCA \
  -r "./ocfl-repo" -x "/data/override" \
  -d "/data/override" \
  -D true \
  -p "temp" -z "scratch"
```

## Cleaning Temporary Files

```bash
make clean
```

## Running Tests

Run all tests using Mocha:

```bash
npm test
```

Or run a specific test file:

```bash
npx mocha test/elan.spec.js
```

## Debugging in VS Code

1. Open the project folder in VS Code.
2. Go to the "Run and Debug" panel (Ctrl+Shift+D).
3. Select a debug configuration, e.g. **Debug ELAN Tests**.
4. Set breakpoints in your test or source files.
5. Click the green "Start Debugging" button.

### Example Debug Configuration

The `.vscode/launch.json` includes a configuration for debugging tests:

```jsonc
{
  "type": "node",
  "request": "launch",
  "name": "Debug ELAN Tests",
  "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
  "args": [
    "--timeout",
    "999999",
    "--colors",
    "${workspaceFolder}/test/elan.spec.js"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Folder Structure

- `index.js` — Main entry point
- `lib/` — Library modules
- `test/` — Mocha test files
- `MakeFile` — Makefile for common tasks

## Support

For issues or questions, please open an issue