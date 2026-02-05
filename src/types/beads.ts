/**
 * Shared Beads types used by both server (ws-handlers) and client (beads store).
 */

export interface ResolvedDep {
	id: string;
	title: string;
	status: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';
	type: string; // issue_type
}

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
	needs: ResolvedDep[];
	unblocks: ResolvedDep[];
	epic_children?: string[];
	parent_epic_id?: string;
}

export interface BeadsMessage {
	type: 'issues' | 'connected';
	issues: BeadsIssue[];
	project: string;
	timestamp: number;
}

export type BeadsFilter = 'active' | 'all';

export interface EpicGroup {
	epic: BeadsIssue;
	tasks: BeadsIssue[];
	completedCount: number;
	totalCount: number;
	activeCount: number;
	blockedCount: number;
}

export type BeadsStatus = BeadsIssue['status'];

/** Get color for a beads issue status */
export function statusColor(status: BeadsStatus): string {
	switch (status) {
		case 'in_progress':
			return '#27ae60';
		case 'open':
			return '#f39c12';
		case 'blocked':
			return '#e74c3c';
		case 'closed':
		case 'deferred':
		default:
			return '#888888';
	}
}

/** Get color for a priority level (0=critical, 4=backlog) */
export function priorityColor(priority: number): string {
	switch (priority) {
		case 0:
			return '#e74c3c';
		case 1:
			return '#e67e22';
		case 2:
			return '#f39c12';
		case 3:
			return '#3498db';
		case 4:
		default:
			return '#888888';
	}
}
