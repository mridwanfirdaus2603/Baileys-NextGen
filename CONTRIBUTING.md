# Contributing to Baileys-NextGen

Thank you for your interest in contributing to **Baileys-NextGen**! We are committed to building an open, stable, and high-performance WhatsApp Web API library.

---

## 📋 Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/Baileys-NextGen.git
   cd Baileys-NextGen
   ```

2. **Enable Corepack & install dependencies:**
   ```bash
   corepack enable
   yarn install
   ```

3. **Verify tests and linter:**
   ```bash
   yarn lint
   yarn test
   ```

---

## 🌿 Branching & Git Workflow

- Always branch off `master`.
- Use descriptive branch names:
  - `feat/feature-name` for new capabilities.
  - `fix/bug-name` for bug fixes.
  - `perf/optimization` for performance improvements.
  - `docs/topic-name` for documentation updates.

---

## 💬 Commit Convention

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature or capability.
- `fix:` A bug fix.
- `perf:` Performance or memory optimization.
- `docs:` Documentation-only changes.
- `test:` Adding or updating tests.
- `refactor:` Code restructuring without behavioral changes.

*Example:* `feat(resilience): add dynamic pre-key auto-repair`

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure:
1. All unit tests pass: `yarn test`.
2. Static typing & linter pass with zero warnings: `yarn lint`.
3. If introducing new features or modifying message protocol handlers, write accompanying unit tests in `src/__tests__/`.

---

## 🚀 Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request targeting `master` on `mridwanfirdaus2603/Baileys-NextGen`.
3. Complete the Pull Request template checklist.
4. Maintainers will review your PR and provide constructive feedback.

Thank you for helping make Baileys-NextGen the most resilient WhatsApp Web client! ⭐
