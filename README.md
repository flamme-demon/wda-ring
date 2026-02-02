# wda-ring

Plugin for Wazo Desktop Application (WDA) that allows users to customize their ringtones for incoming calls.

## Features

- **Separate ringtones** for internal and external calls
- **Automatic detection** of call type via WebSocket events
- **Custom audio files** support (browse from computer, max 2MB)
- **Built-in ringtones** library (iPhone, Marimba, Birds, etc.)
- French and English translations

## Build

### Using npm

```bash
npm run build
```

### Using Docker

```bash
docker build -t ring .
```

## Run

### Using Docker

```bash
docker run --rm --name ring -p 8901:80 ring
```

The plugin will be available at `http://localhost:8901`

## Development

```bash
# Build files to public/
./build.sh

# Clean build
npm run clean
```

## Configure

To use the plugin on WDA:

1. Go to Portal → Settings → Applications → Apps Configuration
2. Create or edit Wazo Desktop
3. In Advanced settings, add:
   - Key: `manifest_urls`
   - Value: `["http://YOUR_URL/manifest.json"]`

Replace `YOUR_URL` with your Docker deployment URL.

## Screenshots

![menu1](./screenshots/menu1.png?raw=true)
![menu2](./screenshots/menu2.png?raw=true)

