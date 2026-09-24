# 🚀 Project Setup Guide: svn-visualizer

Welcome to your newly generated **cli** project! This document outlines what was scaffolded, the automated steps already completed, and the remaining manual adjustments required to finalize your setup.

**Status:** 🟢 **Successfully Completed**

## 📦 What Was Generated
* **Project Name:** `svn-visualizer`
* **Template Used:** `cli`
* **Package Manager:** `pnpm`

---

## 📋 Initialization Checklist
The following tasks were executed during the generation process:
- [x] Scaffold project files and directories
- [x] Configure `package.json` with appropriate dependencies
- [ ] Install dependencies using `pnpm` *(Skipped)*
- [x] Initialize Git repository (main branch)
- [ ] Create and push GitHub repository *(Skipped)*
- [ ] Run initial CI pipeline (lint, build, test) *(Skipped)*

## ⏭️ Complete Skipped Steps Manually
Some initialization steps were marked as *(Skipped)*. Use the guidance below to complete them yourself:
- [ ] **Install dependencies manually:** Run `pnpm install` from the project root.
- [ ] **Create and push GitHub repository manually:** Verify GitHub CLI auth with `gh auth status`, then run `gh repo create svn-visualizer --public --source=. --remote=origin --push`.
- [ ] **Run CI checks manually:** After dependencies are installed, run `pnpm run ci`.

---

## 🛠️ Manual Adjustments Needed
To complete your project setup, please review and manually update the following:
- [ ] **`LICENSE`**: Verify the copyright year and author name.
- [ ] **`package.json`**: Review the description, keywords, author, and repository links.
- [ ] **`README.md`**: Update with project-specific instructions, architecture details, and contribution guidelines.
- [ ] **`.gitignore`**: Note that there is a **`# Custom`** section at the end of the file for your own ignores.

---

## 💡 Next Steps
1. Review the generated codebase to familiarize yourself with the structure.
2. Start the development server using `pnpm run dev`.
3. Make your first commit and push to your remote repository.

---

## 💻 Available Commands
You can run these commands from the project root using `pnpm run <command>`:

| Command | Description |
| :--- | :--- |
| `dev` | Starts the development server |
| `build` | Builds the project for production |
| `test` | Runs the unit test suite (Vitest) |
| `lint` | Lints and formats the codebase |
| `ci` | Runs lint, build, and test (used by CI/CD) |

---

## 🏗️ CLI Architecture
This project uses `commander` for argument parsing and `@clack/prompts` for interactive CLI interfaces.

### Source Files Generated
- **`src/index.ts`**: The main execution entry point. Handles top-level errors and bootstraps the CLI application.
- **`src/cli.ts`**: Parses command-line arguments and orchestrates your user prompts.

### How to Enhance
- Add new sub-commands directly in `src/cli.ts`.
- Extract logic into a new `src/commands/` directory as your application scales.

---

## 🧪 Testing Strategy

### Unit Testing (Vitest)
This project is pre-configured with **Vitest** for blazing-fast unit testing and coverage reporting.
- **Where to put tests**: Create files with the `.test.ts` or `.spec.ts` extension next to your source files (e.g., `src/main.test.ts`).
- **How to run**: `pnpm run test`
- **Watch mode**: `pnpm exec vitest` to automatically re-run tests on file changes.
- **Coverage**: Coverage is generated automatically during the test run. Aim for high coverage on core logic!

### End-to-End (E2E) Testing
Currently, only unit tests are scaffolded by default. To enhance your project's reliability, we highly recommend adding E2E testing:
- **For Web Apps**: Consider installing [Playwright](https://playwright.dev/) (`pnpm create playwright`) to simulate real user interactions in the browser.
- **For CLIs**: Consider using `execa` within your Vitest suite to invoke your compiled CLI binary and assert its `stdout`/`stderr` outputs.

---

## 🐙 Key Git Commands
Here are the most common Git operations you will use to manage your codebase:

| Command | Description |
| :--- | :--- |
| `git status` | Check the current state of your working directory |
| `git add .` | Stage all your changes for the next commit |
| `git commit -m "feat: your feature"` | Create a new commit (following Conventional Commits) |
| `git push` | Push your committed changes to the remote repository |
| `git pull` | Fetch and merge changes from the remote repository |
| `git checkout -b <branch>` | Create and switch to a new branch |

---

## 🐈 Key GitHub (`gh`) Commands
The `gh` CLI provides powerful tools to interact with GitHub right from your terminal:

| Command | Description |
| :--- | :--- |
| `gh repo view --web` | Open the repository in your default web browser |
| `gh repo create <name> --public --source=. --remote=origin --push` | Create and push a new GitHub repository |
| `gh pr create` | Create a new Pull Request |
| `gh pr checkout <pr-number>` | Checkout a Pull Request branch locally |
| `gh issue create` | Create a new Issue |
| `gh issue list` | List all open Issues |
| `gh repo delete <owner>/<repo> --yes` | Dangerously delete a repository completely (use with caution!) |

---

## 🚀 Creating a Release
This project uses Conventional Commits and automated changelogs. To create a new release:
1. **Run the release command:** `pnpm release`

This single command will automatically run your CI suite, bump the version, generate a changelog, create a Git tag, push to GitHub, and create a GitHub release.

**Note:** NPM publishing is disabled by default. See `CONTRIBUTING.md` for details on how to enable it.

---

<br>
<p align="center"><i>This file was auto-generated by <b>create-template-project</b>.</i></p>