# Changelog

All notable changes to the **Baileys Next-Gen Edition** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [7.0.0-rc14] - 2026-07-29

### 🚀 Major Enhancements & Enterprise Architecture
* **Human Natural Engine (HNE / Anti-Ban):**
  * Integrated dynamic typing duration calculated from target Words Per Minute (WPM).
  * Added Gaussian jitter algorithm on micro-typing intervals to evade automated spam heuristic detection.
  * Automated presence transitions: `composing` → realistic typing window → pause → payload dispatch.

* **Next-Gen Pairing Suite:**
  * Added responsive interactive Terminal ASCII UI Card with live countdown timer.
  * Added embedded local Web Pairing Dashboard (default port `3000`) for headless web pairing.
  * Added multi-channel notification relays supporting Telegram bot dispatch and custom webhook listeners.
  * Built-in E.164 international phone number sanitization and pre-validator.

* **Resilience Engine & Auto-Recovery:**
  * **Automatic Pre-Key Desync Repair:** Real-time interception of `Bad MAC` and `SignalErrorBadMac` exceptions with automatic localized session purging (`session.${jid}`) without tearing down the client WebSocket connection.
  * **429 Rate-Limit Shield:** Adaptive Exponential Backoff with Full Jitter for handling HTTP 429 and rate-limiting responses.
  * **Multi-Proxy Switcher:** Added connection proxy pool rotation supporting `round-robin`, `random`, and automated failover strategies.
  * **Circuit Breaker Shield:** Automatic tripping threshold to prevent cascade failures when Meta servers throttle requests.
  * **Session Revival Engine:** Automated handling of transient disconnect codes (`515`, `428`) with zero-touch reconnection.

* **Call Guard & Security Vault:**
  * Built-in auto-rejection for incoming WhatsApp voice and video calls with customizable automatic reply text.
  * Added auto-block toggle for persistent spam callers.
  * **ViewOnce Auto-Saver:** Automatically captures and archives one-time view media to secure local storage.
  * **Deleted Message Tracker:** In-memory and persistent revoking event interceptor for deleted messages.

* **Express-like Command Router:**
  * Introduced middleware pipeline with sequential `router.use()` handlers.
  * Command handler registration via `router.cmd()` with configurable prefixes (`!`, `/`, `.`).
  * Enriched unified context object (`ctx`) providing `ctx.reply()`, `ctx.sender`, `ctx.args`, and typing helpers.

* **Multi-Store Auth & Encrypted Storage:**
  * Added AES-256-GCM authenticated encryption for local session files (`EncryptedFileStoreDriver`).
  * Pluggable session storage drivers (`MemoryStoreDriver`, `EncryptedFileStoreDriver`).

* **AI Agent & Antigravity Framework Bridge:**
  * Standardized tool-calling abstractions for seamless integration with LLMs (Google Gemini, OpenAI, Claude).
  * Built-in token conservation throttling and conversation history contextual windowing.

### 🧪 Quality Assurance & Test Coverage
* Verified **100% test pass rate** across all suites: **34/34 Test Suites Passed | 438/438 Unit Tests Passed**.
* Upgraded type assertions to **TypeScript 5.9 Strict Mode**.
* Upgraded build pipeline to **Yarn 4 Berry** with Corepack.

---

## [7.0.0-rc1] - 2026-06-15

### Added
* Initial release of Baileys Next-Gen Edition fork.
* Decoupled WebSocket core with optimized Protobuf serialization.
* Native Rust Bridge binding integration (`whatsapp-rust-bridge`).
