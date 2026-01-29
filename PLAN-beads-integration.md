# Beads Integration Plan

## Overview

Add beads issue tracking integration to claude-watch sidebar drawer, optimized for mobile use.

**Core workflow**: Swipe drawer → see issues → tap to insert ID into chat input

---

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| Primary device | Mobile (phone) |
| UI location | Sidebar drawer |
| Tap action (in session) | Insert ID into input field |
| Tap action (main page) | Explore only, show details |
| Default filter | Buttons: Ready / Open / All |
| Visual style | Simple list, status-colored dots |
| Real-time | Watch for changes, update automatically |

---

## Phase 1: Data Layer

### 1.1 BeadsStore (`web/src/lib/stores/beads.svelte.ts`)

Svelte 5 runes store for beads issues:

```typescript
interface BeadsIssue {
  id: string;           // e.g., "claude-watch-xxx"
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';
  priority: number;     // 0-4
  issue_type: string;   // task, bug, feature, epic
  dependencies: { depends_on_id: string }[];
  // ... other fields as needed
}

class BeadsStore {
  issues = $state<BeadsIssue[]>([]);
  filter = $state<'ready' | 'open' | 'all'>('open');
  loading = $state(false);

  // Computed
  get filteredIssues() { ... }

  // Methods
  async loadIssues(gitRoot: string): Promise<void>;
  setFilter(filter: 'ready' | 'open' | 'all'): void;
}
```

### 1.2 API Endpoint (`web/src/routes/api/beads/+server.ts`)

```
GET /api/beads?project=/path/to/git/root&filter=ready
```

Server-side: Run `bd list --json` or `bd ready --json` and return results.

### 1.3 File Watcher (optional, Phase 4)

Watch `.beads/issues.jsonl` per project and broadcast changes via WebSocket.

---

## Phase 2: Sidebar UI

### 2.1 Beads Section in Drawer

Add collapsible "Issues" section below sessions list in `SessionsSidebar.svelte`:

```
┌─────────────────────────┐
│ 🏠 Claude Watch         │
├─────────────────────────┤
│ Sessions                │
│ ├─ project-a (2)        │
│ │  └─ session items...  │
│ └─ project-b (1)        │
│    └─ session items...  │
├─────────────────────────┤
│ Issues          [▼]     │  ← Collapsible
│ [Ready] [Open] [All]    │  ← Filter buttons (pills)
│ ┌─────────────────────┐ │
│ │ 🟢 xxx Task title   │ │  ← Issue item
│ │ 🟡 yyy Bug title... │ │
│ │ 🔴 zzz Blocked...   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 2.2 Issue Item Component

```svelte
<button class="issue-item" onclick={handleTap}>
  <span class="status-dot" style="background: {statusColor}"></span>
  <span class="issue-id">{issue.id.split('-').pop()}</span>
  <span class="issue-title">{truncate(issue.title, 30)}</span>
</button>
```

Status colors:
- 🟢 Green: `in_progress`
- 🟡 Yellow: `open`
- 🔴 Red: `blocked`
- ⚪ Gray: `closed`, `deferred`

### 2.3 Filter Buttons

Pill-style toggle buttons:
- **Ready**: Issues with no blockers (`bd ready`)
- **Open**: `status in (open, in_progress)`
- **All**: Everything

---

## Phase 3: Tap-to-Insert

### 3.1 Context Detection

Detect if user is viewing a session (`/session/[target]`) or main page:

```typescript
import { page } from '$app/stores';

const isSessionView = $derived(
  $page.url.pathname.startsWith('/session/')
);
```

### 3.2 Insert Mechanism

When in session view, tapping issue calls:

```typescript
function insertIssueId(issueId: string) {
  // Get reference to session input textarea
  // Append or replace text with issue ID
  sessionInput.value += issueId;
  sessionInput.focus();
}
```

Implementation options:
1. **Store-based**: BeadsStore emits event, session page listens
2. **Context-based**: Pass input ref via Svelte context
3. **DOM-based**: Query selector for input element

### 3.3 Feedback

- Brief highlight on the issue item
- Optional toast: "Inserted claude-watch-xxx"
- Haptic feedback (if supported)

---

## Phase 4: Enhancements (Future)

### 4.1 Real-time Updates

- WebSocket channel: `/api/beads/stream?project=...`
- Watch `.beads/issues.jsonl` for changes
- Broadcast updates to connected clients

### 4.2 Issue Details

- Long-press or tap on main page → show issue details sheet
- Display: full title, description, dependencies, priority

### 4.3 Session-Issue Linking

- Associate issues with sessions (stored in session JSON)
- Show linked issues as badges in session header
- "Working on: claude-watch-xxx"

### 4.4 Project Scoping

- Auto-detect project from selected session
- Or: show issues for all beads-enabled projects

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `web/src/lib/stores/beads.svelte.ts` | BeadsStore |
| `web/src/routes/api/beads/+server.ts` | API endpoint |
| `web/src/lib/components/BeadsPanel.svelte` | Sidebar beads UI |
| `web/src/lib/components/IssueItem.svelte` | Single issue row |

### Modified Files

| File | Changes |
|------|---------|
| `web/src/lib/components/SessionsSidebar.svelte` | Add BeadsPanel |
| `web/src/routes/session/[target]/+page.svelte` | Handle insert event |
| `web/src/routes/+layout.svelte` | Initialize BeadsStore |

---

## Technical Considerations

### Running `bd` Commands

The server needs to execute `bd list --json`. Options:
1. **Direct exec**: `Bun.spawn(['bd', 'list', '--json', '--cwd', gitRoot])`
2. **Read JSONL**: Parse `.beads/issues.jsonl` directly (faster, no CLI dep)
3. **SQLite query**: Query `.beads/beads.db` directly (fastest, but daemon may lock)

Recommendation: Start with CLI exec, optimize later if needed.

### Multi-Project

Sessions can be in different projects. Options:
1. Show issues for "active" session's project only
2. Show issues grouped by project (like sessions)
3. Let user select project

Recommendation: Show issues for selected session's project, with project indicator.

### Mobile UX

- Large tap targets (min 44px height)
- Swipe drawer already implemented
- Filter buttons should be thumb-reachable
- Consider bottom placement for filter buttons

---

## Open Questions

1. Should closed issues ever be shown? (Maybe in "All" filter only)
2. Priority indicator? (Could show P0/P1 with a badge)
3. Issue type icons? (🐛 bug, ✨ feature, 📋 task)

---

## Estimated Scope

- **Phase 1-3 (MVP)**: Core functionality
- **Phase 4**: Nice-to-haves

Dependencies: shadcn-svelte components (already installed)
