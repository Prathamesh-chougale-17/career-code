# Careeright Desktop Release

Careeright Desktop releases are created from Git tags and published as GitHub
Release artifacts for Windows, macOS, and Linux.

## Release Command

Update the desktop version in both files before tagging:

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`

Then create and push a desktop release tag:

```bash
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

The `Careeright Desktop Release` GitHub Actions workflow builds installers on:

- `windows-latest`
- `macos-latest`
- `ubuntu-22.04`

The workflow creates a draft GitHub Release. Review the artifacts, then publish
the draft release when the installers look correct. Published releases are what
the desktop updater sees through the GitHub `latest.json` asset.

## Website Distribution

The web download page points to:

```text
https://github.com/Prathamesh-chougale-17/career-code/releases/latest
```

After publishing a GitHub Release, users can download the correct installer from
that page.

## Auto Updates

Careeright Desktop uses the Tauri v2 updater with signed update artifacts. The
app checks GitHub Releases on launch and periodically while it is open:

```text
https://github.com/Prathamesh-chougale-17/career-code/releases/latest/download/latest.json
```

The updater only offers versions newer than the installed app version. To ship
an update:

1. Bump the desktop version in `apps/desktop/package.json`,
   `apps/desktop/src-tauri/tauri.conf.json`, and
   `apps/desktop/src-tauri/Cargo.toml`.
2. Push a new tag such as `desktop-v1.0.1`.
3. Let GitHub Actions build the signed installers and `latest.json`.
4. Publish the draft GitHub Release.

Users will see an in-app update prompt after the release is published. They can
install it directly from the app and Careeright will relaunch into the new
version.

## Signing

Unsigned builds are acceptable for early beta testing, but public production
distribution should use platform signing:

- Windows: code-sign the `.exe`/`.msi` to reduce SmartScreen warnings.
- macOS: sign and notarize with an Apple Developer account.
- Linux: distribute `.AppImage` and `.deb`; signing is optional but recommended
  for package repositories.

Tauri updater signing is separate from platform signing. It verifies that update
packages came from us before the app installs them. The public updater key is
committed in `apps/desktop/src-tauri/tauri.conf.json`; keep the private key
secret.

The private updater key was generated at:

```text
C:\Users\prath\.tauri\careeright-desktop.key
```

Add it to GitHub repository secrets before the first updater-enabled release:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/careeright-desktop.key
```

If you regenerate the updater key with a password, also set:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

For local production builds, point Tauri at the same private key:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PATH="$env:USERPROFILE\.tauri\careeright-desktop.key"
pnpm --filter @careeright/desktop tauri:build
```
