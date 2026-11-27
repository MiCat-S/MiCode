# Product usage data and diagnostics

MI Code sends no product usage data unless you turn it on. When you do, prompts, responses, file contents, and credentials are never included (unless you explicitly approve an [agent feedback](#agent-feedback) card with conversation text attached).

## Product usage events

When enabled, the server sends usage events to T3 Code's endpoint at `ingest.t3.codes` under a hashed random install ID (plus random client device IDs). Events contain provider, catalog model name (non-catalog models report as custom), reasoning effort, permission mode, turn/request outcome, duration, release channel, and token counts.

## Turn telemetry on or off

- **Server / CLI**: Set `T3CODE_TELEMETRY_ENABLED=true` before starting to opt in. `DO_NOT_TRACK=1` keeps telemetry off even when you opt in.
- **Desktop app**: Export the same variables in your shell profile (macOS/Linux) or user environment variables (Windows) and restart.
- **Managed policy**: Administrators can set `"telemetry": false` in [managed policy](./managed-policy.md#other-capabilities) for servers and desktop apps.

## Mobile app

The mobile app sends no crash reports or connection traces. Mobile builds from this repository also turn Expo over-the-air updates off. Install a new build to update, or opt in at build time with `T3CODE_MOBILE_UPDATES_ENABLED=1` and your own `T3CODE_EAS_PROJECT_ID`.

## Desktop app updates

Desktop builds from this repository check [MI Code Releases](https://github.com/MiCat-S/MiCode/releases) for updates by default. Turn off **Check for updates automatically** in **Settings → About** to stop the checks (you can still check by hand there), or set `T3CODE_DISABLE_AUTO_UPDATE=true` in the app's launch environment to turn the updater off entirely.

## Agent feedback

Optional tool for agents to report T3 Code bugs or missing capabilities. Configure in **Settings → Labs → Agent feedback**:

- **Off** (default): Feedback tools and `t3 feedback` are disabled.
- **When I ask**: Agents submit a report only when you ask, shown as an interactive approval card before anything leaves your machine.
- **Automatic**: Also sends minimal automated reports (problem kind + tool/command name only—no text or conversation) when an agent hits a T3 tool failure; enables `t3 feedback` CLI reporting (up to 10/hour).

Approval cards show exact payloads (expected/actual/workaround, turn outline with no text, and optional **Include the conversation** up to 16 KB). File paths, usernames, hostnames, git remotes, and secret-like strings are scrubbed before saving, and reports use one-off random IDs. Reports leave your machine only when product usage events are turned on; otherwise they stay local. Inspect local reports with `t3 feedback list [--json]`.

## Export diagnostics to your own OpenTelemetry receiver

Open **Settings → Maintenance → Diagnostics** (per environment) and enter OTLP HTTP endpoints (e.g. `http://localhost:4318/v1/traces`), save, and restart the server. Use **Test** to verify connectivity.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` env vars override saved settings (use `T3CODE_OTLP_HEADERS` / `T3CODE_OTLP_PROTOCOL=http/protobuf` or the standard `OTEL_EXPORTER_OTLP_*` equivalents for auth and protobuf).
