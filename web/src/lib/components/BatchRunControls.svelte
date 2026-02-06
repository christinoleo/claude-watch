<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { BatchRun } from '$shared/types/batch-run.js';

	interface Props {
		sessionId: string;
		tmuxTarget: string;
		project: string;
		epicId: string;
	}

	let { sessionId, tmuxTarget, project, epicId }: Props = $props();

	let batchRun = $state<BatchRun | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	// Poll for batch run status
	async function fetchStatus() {
		try {
			const res = await fetch('/api/batch-run');
			if (!res.ok) return;
			const data = await res.json();
			// Find the batch run for this session + epic
			const runs = data.batchRuns as BatchRun[];
			batchRun = runs.find((r) => r.sessionId === sessionId && r.epicId === epicId) ?? null;
		} catch {
			// Ignore fetch errors during polling
		}
	}

	function startPolling() {
		fetchStatus();
		pollTimer = setInterval(fetchStatus, 2000);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	$effect(() => {
		startPolling();
		return () => stopPolling();
	});

	async function startBatchRun() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/batch-run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					tmuxTarget,
					projectPath: project,
					epicId
				})
			});
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to start';
				return;
			}
			batchRun = await res.json();
		} catch (err) {
			error = String(err);
		} finally {
			loading = false;
		}
	}

	async function controlBatchRun(action: 'pause' | 'resume' | 'stop') {
		if (!batchRun) return;
		try {
			const res = await fetch(`/api/batch-run/${batchRun.id}`, {
				method: action === 'stop' ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: action !== 'stop' ? JSON.stringify({ action }) : undefined
			});
			if (res.ok) {
				if (action === 'stop') {
					batchRun = null;
				} else {
					batchRun = await res.json();
				}
			}
		} catch {
			// Ignore
		}
	}

	const isActive = $derived(
		batchRun && (batchRun.status === 'running' || batchRun.status === 'paused' || batchRun.status === 'waiting_for_user')
	);

	const statusLabel = $derived.by(() => {
		if (!batchRun) return '';
		switch (batchRun.status) {
			case 'running': return 'Running';
			case 'paused': return 'Paused';
			case 'waiting_for_user': return 'Waiting';
			case 'completed': return 'Done';
			case 'failed': return 'Failed';
		}
	});

	const statusColor = $derived.by(() => {
		if (!batchRun) return '';
		switch (batchRun.status) {
			case 'running': return '#27ae60';
			case 'paused': return '#f39c12';
			case 'waiting_for_user': return '#e74c3c';
			case 'completed': return '#888';
			case 'failed': return '#e74c3c';
		}
	});
</script>

{#if isActive}
	<div class="batch-run-controls">
		<div class="status-row">
			<span class="status-dot" style="background: {statusColor}"></span>
			<span class="status-label">{statusLabel}</span>
			<span class="progress">{batchRun!.completedTasks.length} done{#if batchRun!.remainingCount > 0}, {batchRun!.remainingCount} left{/if}</span>
		</div>

		{#if batchRun!.currentTask}
			<div class="current-task">
				<iconify-icon icon="mdi:play-circle-outline" style="color: #27ae60; font-size: 12px;"></iconify-icon>
				<span>{batchRun!.currentTask.title}</span>
			</div>
		{/if}

		<div class="control-buttons">
			{#if batchRun!.status === 'running' || batchRun!.status === 'waiting_for_user'}
				<Button variant="outline" size="sm" onclick={() => controlBatchRun('pause')} class="ctrl-btn">
					<iconify-icon icon="mdi:pause"></iconify-icon>
					Pause
				</Button>
			{:else if batchRun!.status === 'paused'}
				<Button variant="outline" size="sm" onclick={() => controlBatchRun('resume')} class="ctrl-btn">
					<iconify-icon icon="mdi:play"></iconify-icon>
					Resume
				</Button>
			{/if}
			<Button variant="ghost" size="sm" onclick={() => controlBatchRun('stop')} class="ctrl-btn stop-btn">
				<iconify-icon icon="mdi:stop"></iconify-icon>
				Stop
			</Button>
		</div>
	</div>
{:else if !batchRun || batchRun.status === 'completed'}
	<button class="start-btn" onclick={startBatchRun} disabled={loading} type="button" title="Run all ready tasks in this epic sequentially">
		<iconify-icon icon="mdi:play-circle-outline"></iconify-icon>
		{#if loading}Starting...{:else}Batch Run{/if}
	</button>
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}
{/if}

<style>
	.batch-run-controls {
		padding: 8px 12px;
		margin: 4px 0;
		background: hsl(var(--accent) / 0.3);
		border-radius: 6px;
		font-size: 12px;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-label {
		font-weight: 600;
	}

	.progress {
		color: hsl(var(--muted-foreground));
		margin-left: auto;
	}

	.current-task {
		display: flex;
		align-items: center;
		gap: 4px;
		color: hsl(var(--muted-foreground));
		font-size: 11px;
		margin-bottom: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.control-buttons {
		display: flex;
		gap: 4px;
	}

	.control-buttons :global(.ctrl-btn) {
		height: 26px;
		font-size: 11px;
		gap: 4px;
	}

	.control-buttons :global(.stop-btn) {
		color: hsl(var(--muted-foreground));
	}

	.start-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border: none;
		background: hsl(var(--accent) / 0.5);
		color: hsl(var(--foreground));
		font-size: 11px;
		font-family: inherit;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
	}

	.start-btn:hover:not(:disabled) {
		background: hsl(var(--accent));
	}

	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-msg {
		color: hsl(var(--destructive));
		font-size: 11px;
		margin-top: 4px;
	}
</style>
