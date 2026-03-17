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

## Installation

**One command** (run from Vencord root):

```bash
git clone https://github.com/offxeliko/vencord-toolkit.git src/userplugins/toolkit && pnpm build
```

Or use the install script:

```bash
curl -sL https://raw.githubusercontent.com/offxeliko/vencord-toolkit/main/install.sh | bash
```

Restart Discord, then enable **Toolkit** in User Settings > Vencord > Plugins.

## Update

```bash
cd src/userplugins/toolkit && git pull && cd ../../ && pnpm build
```

Or re-run the install script — it detects existing installs and updates automatically.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Media Favorites | Save images to favorites via context menu | On |
| Quick Delete | Bulk delete own messages via context menu | On |
| Quick Delete Limit | Max messages per purge (5-100) | 25 |
