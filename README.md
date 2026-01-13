# SVN Visualizer

CLI tool to extract commit data from SVN repositories and generate static HTML visualizations with charts.

## Features

- Extract commit history from remote SVN repositories
- Serialize commit data to local JSON files
- Generate static HTML pages with embedded charts
- Visualize commits per day/week/month
- Visualize commits per user over different time periods
- Support for both absolute and relative date ranges
- Type-safe with strict TypeScript and Zod validation
- Runs natively in Node.js using experimental type stripping

## Requirements

- Node.js ≥ 22.6.0 (for `--experimental-strip-types` support)
- SVN command-line client installed and accessible in PATH
- Access credentials for target SVN repository

## Installation
```bash
npm install
```

## Usage

The tool has two separate commands:

1. **`gather`** - Fetch commit data from SVN and save to a local file
2. **`generate`** - Generate HTML visualizations from saved data

Both commands always use `svn_data.json` as the data file.

### Build Client Code

Before generating HTML, build the client-side JavaScript:
```bash
npm run build:client
```

### Gather Command

Fetch commit data from SVN repository and serialize to JSON. Data is always saved to `svn_data.json`.

The tool works incrementally:
- **First run**: If `svn_data.json` doesn't exist, all repository history is fetched
- **Subsequent runs**: If `svn_data.json` exists, only new commits since the last gather are fetched and merged
```bash
# First run - fetches all history
node --experimental-strip-types src/gather.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass

# Subsequent runs - fetches only new commits
node --experimental-strip-types src/gather.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass
```

#### Gather Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--url` | Yes | SVN repository URL |
| `--username` | Yes | SVN authentication username |
| `--password` | Yes | SVN authentication password |

- Data is always saved to `svn_data.json`
- Automatically detects if data file exists and works incrementally
- To fetch all history again, delete `svn_data.json` first

### Generate Command

Generate HTML visualizations from `svn_data.json`:
```bash
# Use defaults (svn_data.json → output/)
node --experimental-strip-types src/generate.ts

# Use custom output directory
node --experimental-strip-types src/generate.ts \
	--output-dir ./reports

# Override with custom date range
node --experimental-strip-types src/generate.ts \
	--output-dir ./output \
	--relative-days 7
```

#### Generate Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--output-dir` | No | `output` | Directory for generated HTML output |
| `--date-range` | No | - | Override date range for aggregation (YYYY-MM-DD:YYYY-MM-DD) |
| `--relative-days` | No | - | Override with relative date range |

- Data is always read from `svn_data.json`
- If no date range arguments are provided, the date range stored in the data file is used

### Workflow Examples
```bash
# Initial gather (fetches all history)
node --experimental-strip-types src/gather.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass

# Generate visualizations
npm run build:client
node --experimental-strip-types src/generate.ts

# Daily incremental update (fetches only new commits)
node --experimental-strip-types src/gather.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass

# Regenerate with different date range
node --experimental-strip-types src/generate.ts \
	--relative-days 30

# Start fresh (delete data file and refetch all history)
rm svn_data.json
node --experimental-strip-types src/gather.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass
```
