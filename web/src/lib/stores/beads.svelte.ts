import { browser } from '$app/environment';
import { ReliableWebSocket } from './websocket-base.svelte';

/**
 * Beads issue from the API
 */
export interface BeadsIssue {
	id: string;
	title: string;
	description?: string;
	status: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';
	priority: number;
	issue_type: string;
	owner?: string;
	assignee?: string;
	created_at?: string;
	updated_at?: string;
	dependencies?: { depends_on_id: string; type: string }[];
}

export interface BeadsMessage {
	type: 'issues' | 'connected';
	issues: BeadsIssue[];
	project: string;
	timestamp: number;
}

export type BeadsFilter = 'ready' | 'open' | 'all';

/**
 * BeadsStore - Real-time beads issues store with WebSocket support.
 * Connects per-project and receives updates when issues change.
 */
class BeadsStore extends ReliableWebSocket {
	issues = $state<BeadsIssue[]>([]);
	filter = $state<BeadsFilter>('open');
	currentProject = $state<string | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	/**
	 * Get filtered issues based on current filter setting
	 */
	get filteredIssues(): BeadsIssue[] {
		const issues = this.issues;
		const filter = this.filter;

		switch (filter) {
			case 'ready':
				// Ready = open with no blocking dependencies
				return issues.filter(
					(i) =>
						i.status === 'open' &&
						(!i.dependencies || !i.dependencies.some((d) => d.type === 'blocked_by'))
				);
			case 'open':
				// Open = not closed or deferred
				return issues.filter((i) => i.status !== 'closed' && i.status !== 'deferred');
			case 'all':
			default:
				return issues;
		}
	}

	/**
	 * Get issue count for badge display
	 */
	get issueCount(): number {
		return this.filteredIssues.length;
	}

	protected getWsUrl(): string {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const project = encodeURIComponent(this.currentProject || '');
		return `${protocol}//${window.location.host}/api/beads/stream?project=${project}`;
	}

	protected getLogPrefix(): string {
		return '[beads]';
	}

	protected shouldReconnect(): boolean {
		// Only reconnect if we have a project set
		return !!this.currentProject;
	}

	protected handleMessage(event: MessageEvent): void {
		try {
			const data = JSON.parse(event.data) as BeadsMessage;
			if (data.issues) {
				this.issues = data.issues;
				this.error = null;
			}
		} catch (err) {
			console.error('[beads] Failed to parse message:', err);
		}
	}

	protected onConnected(): void {
		this.loading = false;
		this.error = null;
	}

	protected onDisconnected(): void {
		// Keep issues visible during reconnection
	}

	/**
	 * Connect to a project's beads stream
	 */
	setProject(project: string | null): void {
		if (project === this.currentProject) return;

		// Disconnect from previous project
		if (this.currentProject) {
			this.doDisconnect();
		}

		this.currentProject = project;
		this.issues = [];
		this.error = null;

		// Connect to new project if valid
		if (project && browser) {
			this.loading = true;
			this.doConnect();
		}
	}

	/**
	 * Set the filter type
	 */
	setFilter(filter: BeadsFilter): void {
		this.filter = filter;
	}

	/**
	 * Force refresh issues
	 */
	refresh(): void {
		if (this.currentProject) {
			this.forceReconnect();
		}
	}

	/**
	 * Manually connect (call from layout or page)
	 */
	connect(): void {
		if (this.currentProject && browser) {
			this.doConnect();
		}
	}

	/**
	 * Manually disconnect
	 */
	disconnect(): void {
		this.doDisconnect();
	}
}

export const beadsStore = new BeadsStore();
