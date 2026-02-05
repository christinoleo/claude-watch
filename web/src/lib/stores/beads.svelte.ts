import { browser } from '$app/environment';
import { ReliableWebSocket } from './websocket-base.svelte';

export type {
	ResolvedDep,
	BeadsIssue,
	BeadsMessage,
	BeadsFilter,
	EpicGroup,
	BeadsStatus
} from '$shared/types/beads.js';
import type { BeadsIssue, BeadsMessage, BeadsFilter, EpicGroup } from '$shared/types/beads.js';

/** Check if a non-closed/deferred issue has no active (non-closed) needs */
function hasNoActiveNeeds(issue: BeadsIssue): boolean {
	return issue.needs.every((n) => n.status === 'closed');
}

/** Sort tasks: in_progress → ready (no active needs) → blocked → by priority */
function sortTasks(tasks: BeadsIssue[]): BeadsIssue[] {
	return [...tasks].sort((a, b) => {
		const order = (i: BeadsIssue): number => {
			if (i.status === 'in_progress') return 0;
			if (i.status === 'open' && hasNoActiveNeeds(i)) return 1;
			if (i.status === 'open') return 2; // blocked
			return 3; // closed/deferred
		};
		const ao = order(a);
		const bo = order(b);
		if (ao !== bo) return ao - bo;
		return a.priority - b.priority;
	});
}

/**
 * BeadsStore - Real-time beads issues store with WebSocket support.
 * Connects per-project and receives updates when issues change.
 */
class BeadsStore extends ReliableWebSocket {
	issues = $state<BeadsIssue[]>([]);
	filter = $state<BeadsFilter>('active');
	currentProject = $state<string | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	/** View-filtered issues (active = not closed/deferred, all = everything) */
	viewFilteredIssues: BeadsIssue[] = $derived(
		this.filter === 'active'
			? this.issues.filter((i) => i.status !== 'closed' && i.status !== 'deferred')
			: this.issues
	);

	/** Epic groups with computed stats */
	epicGroups: EpicGroup[] = $derived.by(() => {
		const filtered = this.viewFilteredIssues;
		const allIssues = this.issues;
		const issueMap = new Map(allIssues.map((i) => [i.id, i]));

		const epics = filtered.filter((i) => i.issue_type === 'epic');

		const groups: EpicGroup[] = epics.map((epic) => {
			const childIds = epic.epic_children ?? [];
			// Resolve children from ALL issues (for completedCount) then filter for display
			const allChildren = childIds.map((id) => issueMap.get(id)).filter((i): i is BeadsIssue => !!i);
			const completedCount = allChildren.filter((c) => c.status === 'closed').length;
			const totalCount = allChildren.length;

			// Display tasks: apply the current view filter
			const displayTasks =
				this.filter === 'active'
					? allChildren.filter((c) => c.status !== 'closed' && c.status !== 'deferred')
					: allChildren;

			const activeCount = displayTasks.filter(
				(t) => t.status === 'in_progress' || (t.status === 'open' && hasNoActiveNeeds(t))
			).length;
			const blockedCount = displayTasks.filter(
				(t) => t.status === 'open' && !hasNoActiveNeeds(t)
			).length;

			return {
				epic,
				tasks: sortTasks(displayTasks),
				completedCount,
				totalCount,
				activeCount,
				blockedCount
			};
		});

		// Sort epics: those with in_progress tasks first, then by priority, then alphabetically
		groups.sort((a, b) => {
			const aHasActive = a.tasks.some((t) => t.status === 'in_progress') ? 0 : 1;
			const bHasActive = b.tasks.some((t) => t.status === 'in_progress') ? 0 : 1;
			if (aHasActive !== bHasActive) return aHasActive - bHasActive;
			if (a.epic.priority !== b.epic.priority) return a.epic.priority - b.epic.priority;
			return a.epic.title.localeCompare(b.epic.title);
		});

		return groups;
	});

	/** Non-epic issues without a parent epic */
	orphanTasks: BeadsIssue[] = $derived(
		sortTasks(
			this.viewFilteredIssues.filter((i) => i.issue_type !== 'epic' && !i.parent_epic_id)
		)
	);

	/** Count of non-epic filtered issues (for badge) */
	issueCount: number = $derived(
		this.viewFilteredIssues.filter((i) => i.issue_type !== 'epic').length
	);

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
