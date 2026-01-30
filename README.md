<p align="center">
  <h1 align="center">claude-watch</h1>
  <p align="center">
    <strong>A real-time web dashboard for monitoring and controlling multiple Claude Code sessions</strong>
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aknakos/claude-watch"><img src="https://img.shields.io/npm/v/@aknakos/claude-watch?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@aknakos/claude-watch"><img src="https://img.shields.io/npm/dm/@aknakos/claude-watch?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/aknakos/claude-watch/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aknakos/claude-watch?style=flat-square" alt="license"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="node version">
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20macos-lightgrey?style=flat-square" alt="platform">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#web-interface">Web Interface</a> •
  <a href="#how-it-works">How It Works</a>
</p>

---

## Screenshots

<p align="center">
  <img src="docs/images/desktop-dashboard.png" alt="Desktop Dashboard" width="100%">
  <br>
  <em>Dashboard view — Monitor all your Claude Code sessions at a glance</em>
</p>

<p align="center">
  <img src="docs/images/desktop-session.png" alt="Session View with Syntax Highlighting" width="100%">
  <br>
  <em>Session view — Real-time terminal output with syntax highlighting</em>
</p>

<details>
<summary><strong>📱 Mobile Screenshots</strong></summary>
<br>
<p align="center">
  <img src="docs/images/mobile-dashboard.png" alt="Mobile Dashboard" width="300">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/images/mobile-session.png" alt="Mobile Session" width="300">
</p>
<p align="center"><em>Fully responsive — Control your Claude sessions from your phone</em></p>
</details>

---

## Features

### 🌐 Web Dashboard
- **Real-time monitoring** of all Claude Code sessions via WebSocket
- **Project-based organization** — Sessions grouped by working directory
- **Live status indicators** — See which sessions are busy, idle, or waiting for input
- **One-click navigation** — Jump to any session instantly

### 🎨 Syntax Highlighting
- **Color-coded terminal output** — User prompts, Claude responses, tool calls, and results
- **Tool-specific colors** — Different colors for Read, Write, Edit, Bash, Task, and more
- **Diff highlighting** — Green for additions, red for removals in file edits
- **Toggleable theming** — Switch between styled and raw output

### 📱 Mobile-First Design
- **Fully responsive** — Works on desktop, tablet, and phone
- **Touch-friendly controls** — Large buttons for common actions
- **Quick action toolbar** — Send keys (Up, Down, Tab, Esc, Ctrl-C) with one tap

### 🎮 Session Control
- **Send text input** — Type messages directly to Claude
- **Keyboard shortcuts** — Send special keys and key combinations
- **Terminal resize** — Fit tmux pane to browser viewport
- **Kill sessions** — Terminate Claude processes when needed

### 🔒 Optional Features
- **Authentication** — Password-protect your dashboard
- **LAN access** — Monitor sessions from any device on your network

---

## Installation

### From npm (recommended)

```bash
npm install -g @aknakos/claude-watch
```

### From source

```bash
git clone https://github.com/aknakos/claude-watch.git
cd claude-watch
bun install
bun run build
npm link  # Makes 'claude-watch' available globally
```

---

## Quick Start

### 1. Run setup

```bash
claude-watch setup
```

This will:
- Create the data directory at `~/.claude-watch/`
- Install Claude Code hooks in `~/.claude/settings.json`

### 2. Start the web server

```bash
claude-watch serve --port 3456 --host 0.0.0.0
```

### 3. Open the dashboard

Navigate to `http://localhost:3456` (or your machine's IP for LAN access).

### 4. Start using Claude Code

Any Claude Code session started after setup will appear in the dashboard automatically.

---

## Web Interface

### Dashboard

The main dashboard shows all active Claude Code sessions organized by project:

| Element | Description |
|---------|-------------|
| **Project cards** | Sessions grouped by working directory |
| **Status indicators** | 🟢 Busy, 🟡 Idle, 🔴 Waiting for input |
| **Current action** | Shows what Claude is currently doing |
| **Quick actions** | New session, kill session, refresh |

### Session View

Click any session to open the real-time terminal view:

| Feature | Description |
|---------|-------------|
| **Live output** | Streams terminal content via WebSocket |
| **Syntax highlighting** | Color-coded messages and tool calls |
| **Text input** | Send messages to Claude |
| **Action buttons** | Up, Down, Space, Tab, Esc, Ctrl-C, etc. |
| **Tmux command** | Copy `tmux attach` command for direct access |

### Keyboard Shortcuts (in session view)

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-watch serve` | Start the web server |
| `claude-watch setup` | Run interactive setup wizard |
| `claude-watch uninstall` | Remove hooks and configuration |
| `claude-watch` | Start TUI dashboard (legacy, requires tmux) |

### Server Options

```bash
claude-watch serve [options]

Options:
  -p, --port <number>     Port to listen on (default: 45677)
  -h, --host <string>     Host to bind to (default: "localhost")
  -a, --auth <password>   Enable authentication with password
```

### Examples

```bash
# Start on custom port
claude-watch serve --port 8080

# Allow LAN access
claude-watch serve --host 0.0.0.0

# With authentication
claude-watch serve --host 0.0.0.0 --auth mysecretpassword
```

---

## How It Works

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│  Hook Scripts    │────▶│  JSON Files     │
│  (running)      │     │  (on events)     │     │  (~/.claude-watch/sessions/)
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│  tmux panes     │────▶│  Pane Capture    │──────────────┤
│  (terminal)     │     │  (WebSocket)     │              │
└─────────────────┘     └──────────────────┘              │
                                                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Web Browser     │◀───▶│  SvelteKit      │
                        │  (dashboard)     │     │  (WebSocket)    │
                        └──────────────────┘     └─────────────────┘
```

### Claude Code Hooks

claude-watch uses [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to track session state:

| Hook | Purpose |
|------|---------|
| `SessionStart` | Register new session with PID and working directory |
| `UserPromptSubmit` | Mark session as busy |
| `PreToolUse` | Update status with current tool name |
| `Stop` | Mark session as idle when turn ends |
| `Notification` | Handle permission requests and questions |

### Real-time Updates

- **WebSocket connections** for instant updates (no polling)
- **File watcher** monitors session state changes
- **Pane capture** streams terminal output every 200ms

---

## Terminal UI (Legacy)

claude-watch also includes a terminal-based dashboard for use inside tmux:

```bash
claude-watch  # Requires tmux
```

| Key | Action |
|-----|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Jump to selected session |
| `q` | Quit dashboard |

Press `prefix + W` from any tmux session to jump to the dashboard.

---

## Development

### Prerequisites

- Node.js >= 18 (or Bun)
- tmux (for full functionality)

### Setup

```bash
git clone https://github.com/aknakos/claude-watch.git
cd claude-watch
bun install
```

### Development Server

```bash
bun run dev:serve  # Starts Vite dev server with HMR
```

### Build

```bash
bun run build      # Build CLI + web app
bun run build:cli  # Build CLI only
bun run build:web  # Build web app only
```

### Testing

```bash
bun test           # Run tests
bun run lint       # Lint code
bun run format     # Format code
```

### Project Structure

```
claude-watch/
├── src/                    # CLI and hooks
│   ├── cli.ts              # Entry point
│   ├── commands/           # CLI commands (serve, setup, tui)
│   ├── hooks/              # Claude Code hook handler
│   └── server/             # File watcher, WebSocket handlers
├── web/                    # SvelteKit web app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # UI components
│   │   │   ├── stores/     # Svelte stores (sessions, terminal, preferences)
│   │   │   └── utils/      # Terminal parser, helpers
│   │   └── routes/         # Pages and API routes
│   └── svelte.config.js
└── docs/
    └── images/             # Screenshots
```

---

## Troubleshooting

### Sessions not appearing

1. Ensure you ran `claude-watch setup` to install hooks
2. Restart any running Claude Code sessions (hooks are loaded at startup)
3. Check that `~/.claude/settings.json` contains claude-watch hooks

### Cannot connect from another device

1. Use `--host 0.0.0.0` to allow external connections
2. Check your firewall allows the port
3. Use your machine's LAN IP, not `localhost`

### Status not updating

1. Check hooks are installed: `grep claude-watch ~/.claude/settings.json`
2. Restart Claude Code sessions to pick up new hooks

---

## Requirements

- **Node.js** >= 18 (or Bun)
- **tmux** (required for terminal capture)
- **Claude Code** with hooks support

---

## License

MIT

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`bun test`)
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

---

<p align="center">
  Made with ❤️ for the Claude Code community
</p>
