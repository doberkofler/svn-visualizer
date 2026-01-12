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

### Gather Command

Fetch commit data from SVN repository and serialize to JSON:
```bash
# Last 30 days
node --experimental-strip-types src/cli.ts gather --url https://svn.example.com/repo --username myuser --password mypass --relative-days 30

# Specific date range
node --experimental-strip-types src/cli.ts gather --url https://svn.example.com/repo --username myuser --password mypass --date-range 2024-01-01:2024-12-31
```

#### Gather Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--url` | Yes | SVN repository URL |
| `--username` | Yes | SVN authentication username |
| `--password` | Yes | SVN authentication password |
| `--data-file` | Yes | Path to save serialized commit data |
| `--date-range` | Conditional* | Date range in format `YYYY-MM-DD:YYYY-MM-DD` |
| `--relative-days` | Conditional* | Number of days to look back from today |

*Either `--date-range` or `--relative-days` must be provided, but not both.

### Generate Command

Generate HTML visualizations from previously gathered data:
```bash
# Use date range from data file
node --experimental-strip-types src/cli.ts generate

# Override with custom date range
node --experimental-strip-types src/cli.ts generate --relative-days 7

# Override with specific date range
node --experimental-strip-types src/cli.ts generate --date-range 2024-06-01:2024-12-31
```

#### Generate Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--data-file` | Yes | Path to serialized commit data |
| `--output-dir` | Yes | Directory for generated HTML output |
| `--date-range` | No | Override date range for aggregation |
| `--relative-days` | No | Override with relative date range |

If no date range arguments are provided, the date range stored in the data file is used.

