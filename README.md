# LocalBeam

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Platform: Linux](https://img.shields.io/badge/platform-Linux-lightgrey)

**Transfer files and text between your Linux PC and iPhone/Android — no cables, no cloud, no internet required.** Just a shared WiFi or phone hotspot.

---

## How It Works

Your phone and PC need to be on the same network (your phone's hotspot works perfectly). The PC runs a small web server. Your phone opens it in Safari/Chrome like any website. Everything transfers directly over your local network — nothing leaves your home.

```
iPhone (Safari)  ←──── WiFi / Hotspot ────→  Linux PC (Node.js server)
     ↑                                               ↓
  Scans QR                                    Serves web UI
  Downloads files                             Saves uploads to received/
  Uploads files                               Reads from shared/
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Server** | Node.js + Express | Lightweight, fast, runs everywhere |
| **File uploads** | Multer | Handles multipart form uploads reliably |
| **QR code** | qrcode (npm) | Generates both terminal ASCII and PNG |
| **UI** | Vanilla HTML/CSS/JS | No framework needed — loads instantly on mobile |
| **Fonts** | Syne + Space Mono (Google Fonts) | Clean, modern look |
| **Network** | Node `os` module | Auto-detects your LAN/hotspot IP at startup |
| **Launcher** | Bash + `.desktop` file | Linux desktop integration standard (XDG) |

---

## Features

### Phone → PC
- Tap **Send** tab on your phone
- Pick any file (photo, video, doc, zip — anything)
- Progress bar shows upload status
- File lands in the `received/` folder on your PC instantly

### PC → Phone
- Copy any file into the `shared/` folder on your PC
- Tap the **PC→📱** tab on your phone
- Files appear immediately — tap the download button

### Text / Snippets
- Type or paste anything in the **Send** tab (links, code, notes)
- Appears in the **Texts** tab — tap Copy to grab it
- Last 50 texts are kept in memory while server is running

### Auto-refresh
- The active tab polls the server every 5 seconds automatically
- No need to manually refresh

---

## How the QR Popup Works

When the server starts, three things happen in sequence:

**1. IP detection** — `server.js` uses Node's built-in `os.networkInterfaces()` to scan all network interfaces and find the first non-internal IPv4 address. That's the IP your phone needs to reach the PC.

```js
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return 'localhost';
}
```

**2. QR generation** — the `qrcode` npm package generates two things at once:
- ASCII QR printed to the terminal (for quick use)
- `qr.png` saved to disk (300×300 px) for the popup

```js
await qrcode.toFile('qr.png', url, { width: 300, margin: 2 });
```

**3. Popup via `start.sh`** — the bash launcher polls for `qr.png` to appear (checks every 0.3s), then opens it using whichever image viewer is installed:

```bash
eog qr.png   # GNOME image viewer
feh qr.png   # lightweight viewer
xdg-open qr.png  # fallback: whatever the OS prefers
```

The `||` chain means it tries each one and uses the first that works. On most Linux desktops `eog` or `xdg-open` will handle it.

**4. System notification** — `notify-send` fires a desktop notification saying "Scan the QR code with your phone!" — this appears in the corner of your screen via libnotify.

---

## File Structure

```
transferfile/
├── server.js          # Express server — all routes and HTML UI
├── start.sh           # Bash launcher — starts server, pops QR
├── package.json       # Node dependencies
├── qr.png             # Auto-generated on each start (current IP)
├── received/          # Files uploaded FROM your phone land here
├── shared/            # Files you put here are downloadable ON your phone
└── README.md          # This file
```

---

## Desktop Shortcut

`LocalBeam.desktop` on your desktop is an XDG Desktop Entry — the standard Linux format for application launchers. Double-clicking it runs `start.sh` in a terminal window.

```ini
[Desktop Entry]
Type=Application
Name=LocalBeam
Exec=bash /home/zubair/Downloads/transferfile/start.sh
Icon=network-wireless
Terminal=true
```

`Terminal=true` keeps the terminal open so the server stays running. Closing the terminal stops the server.

---

## Security Notes

- The server binds to `0.0.0.0` — it accepts connections from any device on the network, not just localhost. This is intentional so your phone can reach it.
- It only works on your local network — nothing is exposed to the internet.
- File deletion uses `path.basename()` to prevent path traversal attacks (no one can delete files outside `received/`).
- If UFW firewall is active, you need to allow port 3000 once: `sudo ufw allow 3000/tcp`

---

## Installation

**Prerequisites:** [Node.js](https://nodejs.org/) v18 or later.

```bash
git clone https://github.com/YOUR_USERNAME/localbeam.git
cd localbeam
npm install
```

---

## Start Manually

```bash
node server.js
```

Or use the launcher (opens a QR popup automatically):
```bash
./start.sh
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
