<p align="center">
  <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="MI Code" />
</p>

<h1 align="center">MI Code</h1>

MI Code runs coding agents on your machine and lets you work with them from desktop, web, and mobile. It is an unofficial fork of the [T3 Code source code](https://github.com/pingdotgg/t3code) and is independently maintained. T3 Tools, Inc. does not endorse or maintain MI Code.

Use the subscriptions and tools already configured on your machine, including Claude Code, Codex, Cursor, and other supported providers. A MI Code server keeps threads in sync across its clients. [Remote access](./docs/user/remote-access.md) covers pairing over a local network or VPN.

## Build and install

- **Desktop and CLI.** Check [MI Code Releases](https://github.com/MiCat-S/t3code/releases) for published packages. The [development guide](./docs/operations/00_development.md) explains source builds and packaging for macOS, Windows, and Linux. The existing CLI command is `t3`.
- **Web.** Run `vp run dev` from the repo root after installing the pinned dependencies with `vp i`. Open the link printed by the dev runner.
- **iPhone and Android.** Follow the [mobile build guide](./apps/mobile/README.md) to build with your own signing identity. The mobile build uses MI Code application IDs. For iPhone development with an Xcode Personal Team, use the local build instructions in that guide.

MI Code builds default to product analytics and connection diagnostics off. The mobile diagnostic switches and Expo over-the-air updates default to off as well. Desktop packages use this repository's GitHub Releases when you opt in to the built-in updater. [Diagnostics and update settings](./docs/user/telemetry.md)

The fork keeps the existing `t3` command and data format for compatibility. Set `T3CODE_HOME` to a separate directory if you want to run MI Code alongside another installation with independent local state.

## Contributing

Report MI Code issues on [this repository](https://github.com/MiCat-S/t3code/issues). The [architecture guide](./docs/internals/01_architecture.md) and [documentation index](./docs/README.md) cover the inherited codebase.

## License

The source code is available under the [MIT License](./LICENSE), with the original copyright notice preserved. The [upstream trademark policy](./TRADEMARK.md) describes the T3 Code marks.
