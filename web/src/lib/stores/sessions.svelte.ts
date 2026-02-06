import { browser } from '$app/environment';
import { ReliableWebSocket } from './websocket-base.svelte';

export interface Screenshot {
	path: string;
	timestamp: number;
}

export interface Session {
	v: number;
	id: string;
	pid: number;
	cwd: string;
	git_root: string | null;
	beads_enabled: boolean;
	tmux_target: string | null;
	state: 'busy' | 'idle' | 'waiting' | 'permission';
	current_action: string | null;
	prompt_text: string | null;
	last_update: number;
	pane_title?: string | null;
	screenshots?: Screenshot[];
	chrome_active?: boolean;
	linked_to?: string | null;
}

class SessionStore extends ReliableWebSocket {
	sessions = $state<Session[]>([]);
	paused = $state(false);

	// Saved projects from localStorage
	savedProjects = $state<string[]>([]);

	protected getWsUrl(): string {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		return `${protocol}//${window.location.host}/api/sessions/stream`;
	}

	protected getLogPrefix(): string {
		return '[sessions]';
	}

	protected handleMessage(event: MessageEvent): void {
		if (this.paused) return;
		const data = JSON.parse(event.data);
		if (data.sessions) {
			this.sessions = data.sessions;
		}
	}

	connect(): void {
		this.doConnect();
	}

	disconnect(): void {
		this.doDisconnect();
	}

	togglePause(): void {
		this.paused = !this.paused;
	}

	loadSavedProjects(): void {
		if (!browser) return;
		try {
			this.savedProjects = JSON.parse(localStorage.getItem('claude-mux-projects') || '[]');
		} catch {
			this.savedProjects = [];
		}
	}

	saveProject(cwd: string): void {
		if (!browser || this.savedProjects.includes(cwd)) return;
		this.savedProjects = [...this.savedProjects, cwd];
		localStorage.setItem('claude-mux-projects', JSON.stringify(this.savedProjects));
	}

	removeProject(cwd: string): void {
		this.savedProjects = this.savedProjects.filter((p) => p !== cwd);
		localStorage.setItem('claude-mux-projects', JSON.stringify(this.savedProjects));
	}
}

export const sessionStore = new SessionStore();

// Helper functions
export function stateColor(state: string): string {
	switch (state) {
		case 'permission':
		case 'waiting':
			return '#e74c3c';
		case 'idle':
			return '#f39c12';
		case 'busy':
			return '#27ae60';
		default:
			return '#666';
	}
}

export type SessionGroup =
	| { type: 'pair'; main: Session; orchestrator: Session }
	| { type: 'single'; session: Session };

/**
 * Group sessions into linked pairs (main + orchestrator) and singles.
 * Pairs are identified by the orchestrator's linked_to field pointing to the main's id.
 */
export function groupSessions(sessions: Session[]): SessionGroup[] {
	// Map: mainId -> orchestrator session
	const orchestratorByMain = new Map<string, Session>();
	for (const s of sessions) {
		if (s.linked_to) {
			orchestratorByMain.set(s.linked_to, s);
		}
	}

	const result: SessionGroup[] = [];
	const processed = new Set<string>();

	for (const s of sessions) {
		if (processed.has(s.id)) continue;

		const orchestrator = orchestratorByMain.get(s.id);
		if (orchestrator && !processed.has(orchestrator.id)) {
			result.push({ type: 'pair', main: s, orchestrator });
			processed.add(s.id);
			processed.add(orchestrator.id);
		} else if (!s.linked_to) {
			result.push({ type: 'single', session: s });
			processed.add(s.id);
		}
	}

	// Remaining orphaned orchestrators (main was cleaned up)
	for (const s of sessions) {
		if (!processed.has(s.id)) {
			result.push({ type: 'single', session: s });
		}
	}

	return result;
}

export function getProjectColor(cwd: string): string {
	// Generate a consistent color based on path hash
	let hash = 0;
	for (let i = 0; i < cwd.length; i++) {
		hash = cwd.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 60%, 40%)`;
}
