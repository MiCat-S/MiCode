<p align="center">
  <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="MI Code" />
</p>

<h1 align="center">MI Code</h1>

<p align="center"><a href="./README.md">中文</a> · <strong>English</strong></p>

MI Code is an unofficial fork of [T3 Code](https://github.com/pingdotgg/t3code), maintained independently by one person. T3 Tools, Inc. does not endorse or maintain it. MI Code runs coding agents on your machine and lets you work with them from desktop, web, and mobile, using the subscriptions and setup you already have for Claude Code, Codex, Cursor, and other tools.

MI Code merges upstream T3 Code regularly. It differs from upstream in the ways below.

## How MI Code differs from T3 Code

- **No T3 Connect.** The T3 account sign-in, cloud relay, and their entry points are gone from desktop, web, iOS, and the CLI. Phones and other devices connect to your computer directly over a local network, a VPN, or SSH; see [Remote access](./docs/user/remote-access.md). Features that depend on the relay are off as well: device discovery, guest links, and remote activity push. A device that only ever connected through the cloud relay has to pair again with the computer's direct address.
- **Codex keeps its own identity.** Upstream renames the Codex client to T3 Code. MI Code does not: sessions and model probes identify as `codex-tui` with the installed Codex version, the same as running `codex` in a terminal, and background jobs such as title generation use `codex exec`'s own `codex_exec`.
- **Adjustable idle session timeout.** Upstream ends a resumable agent process 2 minutes after a turn finishes. MI Code keeps it for 30 minutes by default; change it in **Settings → Maintenance → Background activity → Session idle timeout**.
- **Updates come from this repository.** The desktop app checks this repository's [GitHub Releases](https://github.com/MiCat-S/MiCode/releases) by default. Turn automatic checks off in **Settings → About**; manual checks still work. macOS packages are signed with a fixed self-signed certificate and are not notarized by Apple. Release tags look like `v0.1.14+micode.1`.
- **No usage data by default.** Product analytics and connection diagnostics are off by default, and so are the mobile diagnostic switches and Expo over-the-air updates. See [Diagnostics and update settings](./docs/user/telemetry.md).
- **Takes over the `t3` command.** When you install the command from Settings, MI Code replaces a `t3` launcher written by T3 Code. A file with that name from anything else is left alone.
- **Separate app ID.** The desktop app ID is `io.github.micats.micode`, so MI Code installs alongside T3 Code. Both use the data in `~/.t3` by default, in the same format. To give MI Code its own data, set `T3CODE_HOME` to another directory before starting it.

## Install

- **macOS.** Download the latest DMG from [Releases](https://github.com/MiCat-S/MiCode/releases) and drag MI Code into Applications. The app is not notarized, so if macOS blocks the first launch, open **System Settings → Privacy & Security** and choose **Open Anyway**. Later versions update from inside the app.
- **iPhone.** Releases include an unsigned IPA; sign it with your own Apple certificate and provisioning profile to install it. You can also build it yourself with the [mobile build guide](./apps/mobile/README.md), which includes local build steps for an Xcode Personal Team.
- **From source.** Install the pinned dependencies with `vp i` from the repository root, run `vp run dev`, and open the link it prints. The [development guide](./docs/operations/00_development.md) covers builds and packaging for macOS, Windows, and Linux.

## Issues

Report MI Code issues on [this repository](https://github.com/MiCat-S/MiCode/issues). The [architecture guide](./docs/internals/01_architecture.md) and [documentation index](./docs/README.md) cover the code inherited from upstream.

## License

The source code is available under the [MIT License](./LICENSE), with the original copyright notice preserved. The [upstream trademark policy](./TRADEMARK.md) covers the T3 Code marks.
