# Tauri Updater Setup

This project is configured to use Tauri v2 updater with GitHub Releases.

## Current configuration

- Updater endpoint:
  - `https://github.com/jordanheckler-HMM/lumora-sandbox/releases/latest/download/latest.json`
- Updater config location:
  - `frontend/src-tauri/tauri.conf.json` under `plugins.updater`
- Updater artifact generation:
  - `bundle.createUpdaterArtifacts = true` in `frontend/src-tauri/tauri.conf.json`

## Signing key

- Private key file (local only, gitignored):
  - `frontend/src-tauri/keys/updater.key`
- Password file (local only, gitignored):
  - `frontend/src-tauri/keys/updater.password`
- Public key file:
  - `frontend/src-tauri/keys/updater.key.pub`

## GitHub Actions release

Workflow file:
- `/.github/workflows/release.yml`

Trigger:
- Push a tag matching `v*` (for example `v0.1.1`)

macOS targets built for each release:
- `aarch64-apple-darwin` (Apple Silicon)
- `x86_64-apple-darwin` (Intel)

Required repository secrets:
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

These secrets are used by `tauri-action` to sign updater artifacts so in-app update verification succeeds.
