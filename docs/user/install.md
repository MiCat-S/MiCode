# Install MI Code

MI Code runs coding agents on your computer (or server) and lets you control them from the desktop app, web app, or mobile app. Install it on the machine where your agents will run first.

[MI Code Releases](https://github.com/MiCat-S/MiCode/releases) is the download source for packages published by this fork. Build from source with the [development guide](../operations/00_development.md) when the package you need is unavailable.

## Requirements

You need at least one installed, authenticated coding agent (provider) before starting a thread. You can launch MI Code first and set up providers from the [Welcome page](./welcome-page.md) or **Settings → Providers**.

## Desktop app

Releases include a macOS Apple Silicon package. It is signed with a self-signed certificate and is not notarized by Apple. For Windows or Linux, build a package with the [desktop packaging commands](../operations/00_development.md#desktop-artifacts). Desktop builds check MI Code Releases for updates; see [Updating MI Code](./updating.md).

## Mobile app

Releases include an Android ARM64 APK and an unsigned iOS IPA, which you must sign with your own Apple certificate and provisioning profile before installing. To build a client yourself, follow the [mobile guide](../../apps/mobile/README.md) with your own signing identity; an Xcode Personal Team can build and install a local iOS client. The mobile app connects to a server on another machine via [remote access](./remote-access.md).

## Command line

The CLI keeps the `t3` command. The [shell installer](../../scripts/install.sh) and [PowerShell installer](../../scripts/install.ps1) download CLI archives from MI Code Releases when a release includes them. Run a local source checkout with `vp run dev`.

## Providers

Open **Settings → Providers** (web or desktop), select the environment, and enable the providers you use. Installation and sign-in always happen on the **environment's machine**.

| Provider         | Install and authenticate                                                                                                 | Guide                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Codex**        | Connect with ChatGPT in Settings, or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`. | [Codex](./providers-codex.md)             |
| **Claude**       | Install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`.                               | [Claude](./providers-claude.md)           |
| **Cursor**       | Sign in in Settings or install [Cursor CLI](https://cursor.com/cli) and run `agent login`.                               | [Cursor](./cursor.md)                     |
| **Grok Build**   | Install [Grok Build CLI](https://x.ai/cli) and run `grok login`.                                                         | [Grok](./providers-grok.md)               |
| **Antigravity**  | Install managed runtime and sign in with Google in Settings.                                                             | [Antigravity](./providers-antigravity.md) |
| **OpenCode**     | Install [OpenCode](https://opencode.ai) and run `opencode auth login`.                                                   | [OpenCode](./providers-opencode.md)       |
| **Kiro**         | Install [Kiro CLI](https://kiro.dev/docs/cli/) and run `kiro-cli login`.                                                 | [Kiro](./providers-kiro.md)               |
| **Pi**           | Install [Pi](./providers-pi.md) (Node.js 22.19+) and run `pi` → `/login`.                                                | [Pi](./providers-pi.md)                   |
| **Muse Code**    | Install [Muse Code](https://dev.meta.ai/docs/muse-code) and run `muse login`.                                            | [Muse Code](./providers-muse.md)          |
| **fx**           | Install [fx](https://fx.sh) and run `fx login`.                                                                          | [fx](./providers-fx.md)                   |
| **ACP Registry** | Add GitHub Copilot and other agents in **Settings → Providers → Add provider → Show more**.                              | [ACP](./providers-acp.md)                 |

- **Binary path**: If a CLI isn't on the server's `PATH` (common with version managers), set **Binary path** in the provider's settings.
- **Updates**: Click **Update now** on outdated provider cards (supports Homebrew, mise `latest`, npm/pnpm/Yarn/Bun/Volta/Vite+, or the CLI's own updater; update Nix, Chocolatey, or pinned mise installs manually).
- **Multiple instances**: Add extra provider instances for separate accounts, API keys, or custom endpoints (mark secret env vars as sensitive).

### Provider check timeouts

If a working CLI times out during MI Code's readiness check, increase its probe deadline (in milliseconds) in the server's environment (or systemd override / `service.env`) and restart:

```bash
T3CODE_CODEX_PROBE_TIMEOUT_MS=60000 T3CODE_CLAUDE_PROBE_TIMEOUT_MS=60000 t3 serve
```

| Provider     | Environment variable                   |
| ------------ | -------------------------------------- |
| Codex        | `T3CODE_CODEX_PROBE_TIMEOUT_MS`        |
| Claude       | `T3CODE_CLAUDE_PROBE_TIMEOUT_MS`       |
| Cursor       | `T3CODE_CURSOR_PROBE_TIMEOUT_MS`       |
| Antigravity  | `T3CODE_ANTIGRAVITY_PROBE_TIMEOUT_MS`  |
| Grok         | `T3CODE_GROK_PROBE_TIMEOUT_MS`         |
| Kiro         | `T3CODE_KIRO_PROBE_TIMEOUT_MS`         |
| fx           | `T3CODE_FX_PROBE_TIMEOUT_MS`           |
| Pi           | `T3CODE_PI_PROBE_TIMEOUT_MS`           |
| Muse Code    | `T3CODE_MUSE_PROBE_TIMEOUT_MS`         |
| OpenCode     | `T3CODE_OPENCODE_PROBE_TIMEOUT_MS`     |
| ACP Registry | `T3CODE_ACP_REGISTRY_PROBE_TIMEOUT_MS` |

## Next steps

- [User guide index](./README.md): overview of how MI Code works.
- [Working with threads](./thread-sidebar.md): start tasks and organize parallel work.
- [Permission modes](./permission-modes.md): control when agents ask before acting.
- [Remote access](./remote-access.md): connect from another device.
- [Updating MI Code](./updating.md): keep apps, servers, and providers up to date.
