# SVN Visualizer

CLI tool to extract commit data from SVN repositories and generate static HTML visualizations with SVG charts.

## Features

- Extract commit history from remote SVN repositories
- Generate static HTML pages with embedded SVG charts
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

### Basic Usage
```bash
# Last 30 days
node --experimental-strip-types src/cli.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass \
	--output-dir ./output \
	--relative-days 30

# Specific date range
node --experimental-strip-types src/cli.ts \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass \
	--output-dir ./output \
	--date-range 2024-01-01:2024-12-31

# Using npm script
npm start -- \
	--url https://svn.example.com/repo \
	--username myuser \
	--password mypass \
	--output-dir ./output \
	--relative-days 30
```

### CLI Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--url` | Yes | SVN repository URL |
| `--username` | Yes | SVN authentication username |
| `--password` | Yes | SVN authentication password |
| `--output-dir` | Yes | Directory for generated HTML output |
| `--date-range` | Conditional* | Date range in format `YYYY-MM-DD:YYYY-MM-DD` |
| `--relative-days` | Conditional* | Number of days to look back from today |

*Either `--date-range` or `--relative-days` must be provided, but not both.

## Output

The tool generates a single `index.html` file in the specified output directory containing:

1. **Commits per Day** - Bar chart showing daily commit counts
2. **Commits per Week** - Bar chart showing weekly commit counts (ISO week, Monday start)
3. **Commits per Month** - Bar chart showing monthly commit counts
4. **Commits per User (Daily)** - Grouped bar chart comparing users' daily commits
5. **Commits per User (Weekly)** - Grouped bar chart comparing users' weekly commits
6. **Commits per User (Monthly)** - Grouped bar chart comparing users' monthly commits

All charts are static SVG embedded directly in the HTML with no external dependencies.

## Development

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

## Project Structure
```
svn-visualizer/
├── src/
│   ├── cli.ts          # CLI argument parsing and main entry point
│   ├── svn.ts          # SVN command execution
│   ├── parser.ts       # XML log parsing with Zod validation
│   ├── aggregator.ts   # Data aggregation by time periods
│   ├── svg.ts          # SVG chart generation
│   └── generator.ts    # HTML output generation
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
└── README.md
```

## Technical Details

### Time Zone Handling

- All aggregations use local timezone
- Weeks start on Monday (ISO 8601)
- Week numbers follow ISO week date system

### Error Handling

- Fail-fast approach: any error stops execution immediately
- Invalid commits cause parsing to fail
- SVN command failures are reported with exit codes and stderr

### Type Safety

- Strict TypeScript with comprehensive compiler checks
- Runtime validation with Zod schemas
- No `any` types allowed
- Explicit function return types required

### Code Style

- Tabs for indentation
- Semicolons enforced
- Single quotes with no bracket spacing (Prettier)
- Named exports only
- Async/await over promises
- Strict null checks with type guards

## Limitations

- SVN log XML format must be valid
- Large date ranges may be slow (fetches all revisions in range)
- Credentials passed as CLI arguments (consider alternative auth methods for production)
- Self-signed certificates trusted automatically

## License

MIT
