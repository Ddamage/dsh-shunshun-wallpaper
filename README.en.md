# 顺顺壁纸 (dsh-shunshun-wallpaper)

An all-in-one **GIF wallpaper** + **Bilibili music player** plugin for the DeepSeek Harness Web UI.

[中文文档](./README.md)

## 📸 Preview

**Wallpaper animation (original GIF, not screen recording)**

![smooth wallpaper](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/rotating_horse_smooth.gif)

| Full-screen wallpaper | Settings page | Sidebar mini player |
|---|---|---|
| ![wallpaper](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/wallpaper.png) | ![settings](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/settings.png) | ![mini player](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/mini-player.png) |

## ✨ Features

### Wallpaper
- Full-screen GIF wallpaper (3 bundled versions: standard 12fps / smooth 30fps / ultra 100fps; smooth is the default)
- **Theme-aware veil**: white translucent veil on light theme, dark on dark theme, layered for readability
- **Prominence slider** (0–100%, default 50%): from "barely visible" to "fully prominent"
- Enable / disable toggle

### Music
- 5 bundled tracks (飞在八分前 / 绝不认输 / 天下 / 我会一直顺 / 飞八分钱 PHONK)
- **Add music from Bilibili links**: paste a BV / av / b23.tv URL, auto-fetches the 30280-tier AAC audio stream (~200 kbps) and saves as m4a (duplicate titles blocked automatically)
- Delete songs (bundled songs stay removed after restart; Bilibili-downloaded songs delete their files too)
- Volume slider, progress bar with drag-to-seek, playback-error notice
- Three playback modes: single-loop / list-loop / shuffle (in shuffle, next/prev are also random)
- Default track 「飞八分钱 PHONK」, auto-continue
- **Sidebar mini player** (persistent controls: previous / play-pause / next / current title)
- Music keeps playing when the settings panel closes

### Persistence
- Settings (prominence / enabled / volume / mode / current track) auto-save, restored after refresh or restart
- Playlist and deletion records stored in `assets/music/playlist.json`

## 📦 Install

### Option 1: one-line npm install (recommended 🚀)

Published on npm: https://www.npmjs.com/package/dsh-shunshun-wallpaper

```bash
dsh plugin --profile web add dsh-shunshun-wallpaper
```

or:

```bash
npm install dsh-shunshun-wallpaper
```

Restart DSH (`dsh web`) and refresh the browser.

### Option 2: install from source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ddamage/dsh-shunshun-wallpaper.git
   ```
2. **Copy the plugin folder into your DSH profile** (`DSH_HOME` defaults to `~/.dsh`):
   ```bash
   cp -r dsh-shunshun-wallpaper ~/.dsh/profiles/web/wallpaper-plugin
   ```
3. **Register the plugin in the profile `package.json`** (`~/.dsh/profiles/web/package.json`):
   ```json
   {
     "dsh": { "profile": { "bundles": [ /* append */ "dsh-shunshun-wallpaper" ] } },
     "dependencies": { /* append */ "dsh-shunshun-wallpaper": "link:./wallpaper-plugin" }
   }
   ```
4. **Restart DSH** (`dsh web`) and refresh the browser.

> How it works: this package is a **profile bundle** — `dsh.bundle.patch` in `package.json` points to the in-package `cordis.patch.yml`, which mounts the plugin row via `insert:`. You never edit the profile's patch file to add new plugins.

## 🎵 Add your own music

- **Bilibili**: Settings → 顺顺壁纸 → Music → paste a link → Add (auto-downloads the 30280-tier AAC audio)
- **Local files**: drop `.mp3` / `.m4a` files into `assets/music/`, restart DSH and they appear in the playlist

## 🖼️ Change the wallpaper

Put images into `assets/wallpapers/` (gif/png/jpg/webp supported) and point `WALLPAPER_URL` in `lib/client.js` at the filename.

## ⚠️ Notes

- The bundled music files are curated by the author — please confirm copyright compliance before redistributing
- Requires DSH Web mode (`dsh web`); depends on the `webServer` service
- `lib/client.js` must keep the `window.__ModuleLoader__.load({...})` wrapper format (DSH browser-side requirement) — do not convert it back to plain ESM or DSH will fail to boot
- After editing code, sync the installed copy (`~/.dsh/profiles/web/wallpaper-plugin/`) and restart DSH
