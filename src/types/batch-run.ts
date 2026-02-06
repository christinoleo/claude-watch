/**
 * Batch Run types - server-side orchestrator that works through beads tasks sequentially.
 */

export interface BatchRunTask {
	issueId: string;
	title: string;
	status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
	startedAt?: number;
	completedAt?: number;
	error?: string;
}

export type BatchRunStatus =
	| 'running'
	| 'paused'
	| 'waiting_for_user'
	| 'completed'
	| 'failed';

export interface BatchRun {
	id: string;
	sessionId: string;
	tmuxTarget: string;
	projectPath: string;
	epicId: string;
	status: BatchRunStatus;
	completedTasks: BatchRunTask[];
	currentTask: BatchRunTask | null;
	remainingCount: number;
	startedAt: number;
	completedAt?: number;
	error?: string;
	promptTemplate: string;
}

export interface BatchRunStartOptions {
	sessionId: string;
	tmuxTarget: string;
	projectPath: string;
	epicId: string;
	promptTemplate?: string;
}

/** Message format sent to WebSocket clients */
export interface BatchRunMessage {
	type: 'batch-run';
	batchRuns: BatchRun[];
	timestamp: number;
}

export const DEFAULT_PROMPT_TEMPLATE = `Work on beads issue {id}: {title}

{description}

When you're done:
1. Commit your changes
2. Close the issue: bd close {id}
3. Stop and wait`;
