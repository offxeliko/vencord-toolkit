# Vencord Toolkit

Collection of small quality-of-life tweaks for Discord, packed into a single Vencord plugin.

## Features

### Media Favorites
Right click any image in chat to save it to your GIF favorites. Works with attachments, embeds, and links from Discord CDN, Tenor, and Giphy. Toggle favorites from the message popover button too.

### Quick Delete
Bulk delete your own messages via right click context menu. Right click any message and choose **Purge My Messages** with options:
- **This & Above** — delete your messages from the clicked one and above
- **This & Below** — delete your messages from the clicked one and below
- **All Around** — delete your messages in both directions

Features adaptive rate limiting, ESC to cancel mid-purge, and a confirmation dialog showing exactly how many messages will be deleted. Configurable message limit (5-100) via plugin settings.

> Only deletes YOUR messages. Other people's messages are never touched.

## Requirements

This plugin requires **Vencord built from source**. If you installed Vencord via the installer and don't have a source folder, follow the [Vencord build guide](https://docs.vencord.dev/installing/) first:

```bash
git clone https://github.com/Vendicated/Vencord && cd Vencord && pnpm install
```

If you already have Vencord from source, you're good to go.

## Installation

1. Open a terminal in your **Vencord source folder** (the one with `package.json`)
2. Run:

```bash
git clone https://github.com/offxeliko/vencord-toolkit.git src/userplugins/toolkit && pnpm build
```

3. Restart Discord
4. Go to **User Settings > Vencord > Plugins**, find **Toolkit** and enable it

> **How to find your Vencord folder:** it's the folder where you originally cloned and built Vencord. It contains `package.json`, `src/`, and `dist/` directories.

## Update

The plugin checks for updates automatically and will notify you when a new version is available. To update:

```bash
cd src/userplugins/toolkit && git pull && cd ../../ && pnpm build
```

Then restart Discord.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Media Favorites | Save images to favorites via context menu | On |
| Quick Delete | Bulk delete own messages via context menu | On |
| Quick Delete Limit | Max messages per purge (5-100) | 25 |
