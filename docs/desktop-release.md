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
the draft release when the installers look correct.

## Website Distribution

The web download page points to:

```text
https://github.com/Prathamesh-chougale-17/career-code/releases/latest
```

After publishing a GitHub Release, users can download the correct installer from
that page.

## Signing

Unsigned builds are acceptable for early beta testing, but public production
distribution should use platform signing:

- Windows: code-sign the `.exe`/`.msi` to reduce SmartScreen warnings.
- macOS: sign and notarize with an Apple Developer account.
- Linux: distribute `.AppImage` and `.deb`; signing is optional but recommended
  for package repositories.

## Next Step

Add Tauri updater after the first public release is working, then host updater
metadata from GitHub Releases or your website.
