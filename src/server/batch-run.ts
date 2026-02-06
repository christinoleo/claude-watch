/**
 * Batch Run Manager - Server-side orchestrator that works through beads tasks
 * sequentially on a Claude Code session.
 *
 * Monitors session state via the file watcher, sends task prompts via tmux,
 * and advances automatically when tasks are completed.
 */

import { execSync, execFileSync } from 'child_process';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { getAllSessions } from '../db/index.js';
import { sessionWatcher } from './watcher.js';

const execFileAsync = promisify(execFile);

import type {
	BatchRun,
	BatchRunStartOptions,
	BatchRunTask,
	BatchRunMessage
} from '../types/batch-run.js';
import { DEFAULT_PROMPT_TEMPLATE } from '../types/batch-run.js';

interface BdReadyIssue {
	id: string;
	title: string;
	description?: string;
	status: string;
	priority: number;
	issue_type: string;
}

let idCounter = 0;

/**
 * Manages batch runs - one per session at a time.
 */
export class BatchRunManager {
	private runs = new Map<string, BatchRun>();
	private timers = new Map<string, ReturnType<typeof setTimeout>>();
	private unsubscribe: (() => void) | null = null;
	private listeners = new Set<() => void>();

	constructor() {
		// Subscribe to session watcher to detect state changes
		this.unsubscribe = sessionWatcher.subscribe(() => this.onSessionChange());
	}

	/** Subscribe to batch run state changes */
	onChange(callback: () => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	private notifyListeners(): void {
		for (const cb of this.listeners) {
			try {
				cb();
			} catch (e) {
				console.error('[batch-run] Listener error:', e);
			}
		}
	}

	/** Start a new batch run */
	async start(options: BatchRunStartOptions): Promise<BatchRun> {
		// Check no existing run on this session
		for (const run of this.runs.values()) {
			if (run.sessionId === options.sessionId && run.status === 'running') {
				throw new Error(`Session ${options.sessionId} already has an active batch run`);
			}
		}

		const id = `br-${++idCounter}-${Date.now()}`;
		const run: BatchRun = {
			id,
			sessionId: options.sessionId,
			tmuxTarget: options.tmuxTarget,
			projectPath: options.projectPath,
			epicId: options.epicId,
			status: 'running',
			completedTasks: [],
			currentTask: null,
			remainingCount: 0,
			startedAt: Date.now(),
			promptTemplate: options.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE
		};

		this.runs.set(id, run);
		console.log(`[batch-run] Started ${id} for epic ${options.epicId} on session ${options.sessionId}`);

		// Kick off first task
		await this.advanceToNextTask(id);
		this.notifyListeners();
		return run;
	}

	/** Pause a running batch */
	pause(id: string): BatchRun | null {
		const run = this.runs.get(id);
		if (!run || run.status !== 'running') return null;

		run.status = 'paused';
		this.clearTimer(id);
		console.log(`[batch-run] Paused ${id}`);
		this.notifyListeners();
		return run;
	}

	/** Resume a paused batch */
	async resume(id: string): Promise<BatchRun | null> {
		const run = this.runs.get(id);
		if (!run || run.status !== 'paused') return null;

		run.status = 'running';
		console.log(`[batch-run] Resumed ${id}`);

		// If there's a current task, check if it's done. Otherwise advance.
		if (run.currentTask) {
			this.scheduleCompletionCheck(id);
		} else {
			await this.advanceToNextTask(id);
		}
		this.notifyListeners();
		return run;
	}

	/** Stop and remove a batch run */
	stop(id: string): boolean {
		const run = this.runs.get(id);
		if (!run) return false;

		this.clearTimer(id);
		this.runs.delete(id);
		console.log(`[batch-run] Stopped ${id}`);
		this.notifyListeners();
		return true;
	}

	/** Get a specific batch run */
	get(id: string): BatchRun | null {
		return this.runs.get(id) ?? null;
	}

	/** Get all batch runs */
	getAll(): BatchRun[] {
		return [...this.runs.values()];
	}

	/** Get batch run for a specific session */
	getBySession(sessionId: string): BatchRun | null {
		for (const run of this.runs.values()) {
			if (run.sessionId === sessionId) return run;
		}
		return null;
	}

	/** Create a message for WebSocket broadcast */
	createMessage(): BatchRunMessage {
		return {
			type: 'batch-run',
			batchRuns: this.getAll(),
			timestamp: Date.now()
		};
	}

	/** Cleanup */
	destroy(): void {
		for (const id of this.timers.keys()) {
			this.clearTimer(id);
		}
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.listeners.clear();
	}

	// =========================================================================
	// Internal: Session state monitoring
	// =========================================================================

	private onSessionChange(): void {
		const sessions = getAllSessions();
		const sessionMap = new Map(sessions.map((s) => [s.id, s]));

		for (const [id, run] of this.runs) {
			if (run.status !== 'running' || !run.currentTask) continue;

			const session = sessionMap.get(run.sessionId);
			if (!session) continue;

			if (session.state === 'idle') {
				// Session went idle - schedule a completion check
				this.scheduleCompletionCheck(id);
			} else if (session.state === 'waiting' || session.state === 'permission') {
				// Session needs user intervention - mark as waiting
				run.status = 'waiting_for_user';
				console.log(`[batch-run] ${id} waiting for user (session state: ${session.state})`);
				this.notifyListeners();
			}
		}

		// Check waiting_for_user runs - if session is now idle, resume
		for (const [id, run] of this.runs) {
			if (run.status !== 'waiting_for_user') continue;

			const session = sessionMap.get(run.sessionId);
			if (!session) continue;

			if (session.state === 'idle') {
				run.status = 'running';
				console.log(`[batch-run] ${id} resuming after user intervention`);
				this.scheduleCompletionCheck(id);
				this.notifyListeners();
			}
		}
	}

	// =========================================================================
	// Internal: Task lifecycle
	// =========================================================================

	private scheduleCompletionCheck(id: string): void {
		// Don't schedule if already scheduled
		if (this.timers.has(id)) return;

		// Wait 2s for beads to sync, then check
		const timer = setTimeout(() => {
			this.timers.delete(id);
			this.checkTaskCompletion(id);
		}, 2000);
		this.timers.set(id, timer);
	}

	private async checkTaskCompletion(id: string): Promise<void> {
		const run = this.runs.get(id);
		if (!run || run.status !== 'running' || !run.currentTask) return;

		const issueId = run.currentTask.issueId;
		const isClosed = await this.isIssueClosed(run.projectPath, issueId);

		if (isClosed) {
			// Task completed! Record and advance.
			const completed: BatchRunTask = {
				...run.currentTask,
				status: 'completed',
				completedAt: Date.now()
			};
			run.completedTasks.push(completed);
			run.currentTask = null;
			console.log(`[batch-run] ${id} task ${issueId} completed`);

			await this.advanceToNextTask(id);
			this.notifyListeners();
		} else {
			// Not closed yet - check session state
			const sessions = getAllSessions();
			const session = sessions.find((s) => s.id === run.sessionId);

			if (session?.state === 'idle') {
				// Session is idle but task wasn't closed. Wait a bit more, then pause.
				console.log(`[batch-run] ${id} session idle but task ${issueId} not closed, retrying in 5s...`);
				const retryTimer = setTimeout(() => {
					this.timers.delete(id);
					this.retryCompletionCheck(id);
				}, 5000);
				this.timers.set(id, retryTimer);
			}
			// If session is busy, the watcher will notify us when it goes idle again
		}
	}

	private async retryCompletionCheck(id: string): Promise<void> {
		const run = this.runs.get(id);
		if (!run || run.status !== 'running' || !run.currentTask) return;

		const isClosed = await this.isIssueClosed(run.projectPath, run.currentTask.issueId);
		if (isClosed) {
			const completed: BatchRunTask = {
				...run.currentTask,
				status: 'completed',
				completedAt: Date.now()
			};
			run.completedTasks.push(completed);
			run.currentTask = null;

			await this.advanceToNextTask(id);
			this.notifyListeners();
		} else {
			// Still not closed after retry - pause for user review
			run.status = 'paused';
			console.log(`[batch-run] ${id} paused: task ${run.currentTask.issueId} not closed after session idle`);
			this.notifyListeners();
		}
	}

	private async advanceToNextTask(id: string): Promise<void> {
		const run = this.runs.get(id);
		if (!run || run.status !== 'running') return;

		// Get next ready task for this epic
		const nextTask = await this.getNextReadyTask(run.projectPath, run.epicId);

		if (!nextTask) {
			// No more tasks - batch complete!
			run.status = 'completed';
			run.completedAt = Date.now();
			run.remainingCount = 0;
			console.log(`[batch-run] ${id} completed! ${run.completedTasks.length} tasks done.`);
			this.notifyListeners();
			return;
		}

		// Set as current task
		run.currentTask = {
			issueId: nextTask.id,
			title: nextTask.title,
			status: 'running',
			startedAt: Date.now()
		};

		// Update remaining count
		const readyCount = await this.getReadyCount(run.projectPath, run.epicId);
		run.remainingCount = Math.max(0, readyCount - 1); // subtract the one we're about to send

		// Construct and send the prompt
		const prompt = this.buildPrompt(run.promptTemplate, nextTask);
		this.sendToSession(run.tmuxTarget, prompt);

		console.log(`[batch-run] ${id} sent task ${nextTask.id}: ${nextTask.title}`);
		this.notifyListeners();
	}

	// =========================================================================
	// Internal: Beads interaction
	// =========================================================================

	private async getNextReadyTask(
		projectPath: string,
		epicId: string
	): Promise<BdReadyIssue | null> {
		try {
			const { stdout } = await execFileAsync(
				'bd',
				['ready', '--json', '--limit', '1', '--parent', epicId, '--no-daemon'],
				{
					encoding: 'utf-8',
					cwd: projectPath,
					timeout: 5000
				}
			);
			const issues = JSON.parse(stdout) as BdReadyIssue[];
			return issues.length > 0 ? issues[0] : null;
		} catch {
			return null;
		}
	}

	private async getReadyCount(projectPath: string, epicId: string): Promise<number> {
		try {
			const { stdout } = await execFileAsync(
				'bd',
				['ready', '--json', '--limit', '0', '--parent', epicId, '--no-daemon'],
				{
					encoding: 'utf-8',
					cwd: projectPath,
					timeout: 5000
				}
			);
			const issues = JSON.parse(stdout) as BdReadyIssue[];
			return issues.length;
		} catch {
			return 0;
		}
	}

	private async isIssueClosed(projectPath: string, issueId: string): Promise<boolean> {
		try {
			const { stdout } = await execFileAsync('bd', ['show', issueId, '--json', '--no-daemon'], {
				encoding: 'utf-8',
				cwd: projectPath,
				timeout: 5000
			});
			const issues = JSON.parse(stdout) as { status: string }[];
			return issues.length > 0 && issues[0].status === 'closed';
		} catch {
			return false;
		}
	}

	// =========================================================================
	// Internal: Tmux interaction
	// =========================================================================

	private sendToSession(tmuxTarget: string, text: string): void {
		try {
			// Use load-buffer + paste-buffer to handle large text
			execSync('tmux load-buffer -b batch-run-input -', {
				input: text,
				stdio: ['pipe', 'ignore', 'ignore']
			});
			execFileSync('tmux', ['paste-buffer', '-b', 'batch-run-input', '-t', tmuxTarget], {
				stdio: 'ignore'
			});
			execFileSync('tmux', ['delete-buffer', '-b', 'batch-run-input'], { stdio: 'ignore' });
			execFileSync('tmux', ['send-keys', '-t', tmuxTarget, 'Enter'], { stdio: 'ignore' });
		} catch (err) {
			console.error(`[batch-run] Failed to send to tmux target ${tmuxTarget}:`, err);
		}
	}

	// =========================================================================
	// Internal: Prompt building
	// =========================================================================

	private buildPrompt(template: string, task: BdReadyIssue): string {
		return template
			.replace(/\{id\}/g, task.id)
			.replace(/\{title\}/g, task.title)
			.replace(/\{description\}/g, task.description ?? 'No description provided.');
	}

	private clearTimer(id: string): void {
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
	}
}

// Singleton instance
export const batchRunManager = new BatchRunManager();
