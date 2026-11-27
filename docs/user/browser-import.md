# Import browser sessions

Import cookies from another browser into the desktop app's [preview browser](./browser.md) so you can reuse existing signed-in sessions.

## Import a profile

1. Close the source browser.
2. Open **Settings → Browser → Browser profiles → Add profile** and choose a browser under **Import from**.
3. Allow any OS keyring unlock prompt.

This is a one-time copy. Later login changes stay separate, and some sites may still require signing in again.

Agent tabs open in Incognito by default. If you approve an agent's request to open an imported profile, it can use the active logins in that profile. If the browser panel offers **Release control**, you can use it to hand the agent a saved-profile tab you opened in the thread. Choose **Take control** to end that handoff.

## Platform notes

- **macOS (Safari)**: Requires temporary **Full Disk Access** (grant in System Settings, quit/reopen T3 Code if macOS requires it, then reopen the import wizard). You can revoke Full Disk Access afterward.
- **Windows**: Supports Firefox, Zen, and Helium profiles using standard encryption. Other Chromium browsers use app-bound encryption and cannot be imported.
- Partitioned cookies are skipped on all platforms. Administrators can disable cookie import via [managed policy](./managed-policy.md#other-capabilities).
