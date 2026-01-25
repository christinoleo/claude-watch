# Demo Data Script

Generate mock session data for screenshots and demos.

## Usage

```bash
# Seed demo data (automatically backs up your current state)
node scripts/demo-data.js seed

# Take your screenshot, then restore
node scripts/demo-data.js restore
```

## Commands

| Command | Description |
|---------|-------------|
| `seed` | Backs up current database, inserts 7 demo sessions |
| `restore` | Restores database from backup, removes backup file |
| `clear` | Removes only demo sessions (keeps other data, no restore) |

## Demo Sessions

The script creates 7 sessions showing all states:

| State | Color | Sessions |
|-------|-------|----------|
| busy | Green | 3 sessions (Running: Bash, Running: Edit, Working...) |
| idle | Yellow | 2 sessions |
| permission | Red | 1 session |
| waiting | Red | 1 session (with prompt text) |

## Backup Location

Backup is stored at `~/.claude-watch/state.db.backup` and automatically removed after restore.
