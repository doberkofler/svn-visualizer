# svn-visualizer

Generate a self-contained HTML activity report from Subversion history. The repository is hosted on GitHub and the package is private; it is not published to npm.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/doberkofler/svn-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/doberkofler/svn-visualizer/actions/workflows/ci.yml)

## Requirements

- Node.js 22 or newer
- pnpm
- The `svn` command-line client for `gather` and `report`

## Install and build

```bash
pnpm install
pnpm run build
```

The build produces the Node CLI at `dist/index.js` and a Chart.js browser bundle at `dist/client/main.js`. Report generation embeds the browser bundle into `output/index.html`; the result needs no server or external assets.

## Usage

Gather history incrementally:

```bash
pnpm svn-visualizer gather --url https://svn.example.com/project/trunk
```

Generate a report from local data:

```bash
pnpm svn-visualizer generate --relative-days 90 --title "Project activity"
```

Gather and generate in one command:

```bash
pnpm svn-visualizer report --url https://svn.example.com/project/trunk --output-dir output
```

`gather` uses the SVN client's existing authentication configuration when no credentials are supplied. To provide credentials non-interactively, use `--username` and place the password in `SVN_PASSWORD`, or select another environment variable with `--password-env`. There is deliberately no literal password option, and supplied credentials are not cached. Certificate failures are not bypassed.

Common defaults:

| Option | Default |
| --- | --- |
| `--data-file` | `svn-data.json` |
| `--output-dir` | `output` |
| `--password-env` | `SVN_PASSWORD` |
| `--svn-binary` | `svn` |

Use `--from YYYY-MM-DD` and `--to YYYY-MM-DD` for an inclusive UTC period, or `--relative-days N` for a range ending on the current UTC date. These modes cannot be combined.

## Development

- `pnpm run format`: Format source files.
- `pnpm run typecheck`: Check TypeScript.
- `pnpm run test`: Run unit tests with coverage.
- `pnpm run ci`: Run all checks, builds, and tests.

The project retains the create-template-project marker and generated tooling so template updates remain possible. Release tooling creates GitHub releases only; npm publishing is disabled.
