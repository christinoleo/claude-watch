<script lang="ts">
	import type { BeadsIssue, EpicGroup } from '$lib/stores/beads.svelte';
	import { statusColor, priorityColor } from '$shared/types/beads.js';
	import IssueItem from './IssueItem.svelte';
	import BatchRunControls from './BatchRunControls.svelte';

	interface Props {
		group: EpicGroup;
		onSelect?: (issue: BeadsIssue) => void;
		sessionId?: string | null;
		tmuxTarget?: string | null;
		project?: string | null;
	}

	let { group, onSelect, sessionId = null, tmuxTarget = null, project = null }: Props = $props();

	let expanded = $state(false);

	function toggleExpanded() {
		expanded = !expanded;
	}

	function handleUseId(e: Event) {
		e.stopPropagation();
		onSelect?.(group.epic);
	}

	const progressPercent = $derived(
		group.totalCount > 0 ? (group.completedCount / group.totalCount) * 100 : 0
	);
</script>

<div class="epic-section">
	<div class="epic-header-row">
		<button class="epic-header" onclick={toggleExpanded} type="button" style="--epic-color: {statusColor(group.epic.status)}">
			<iconify-icon
				icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
				class="chevron"
				style="color: {statusColor(group.epic.status)}"
			></iconify-icon>
			<span class="epic-title">{group.epic.title}</span>
			<span class="priority-badge" style="background: {priorityColor(group.epic.priority)}">P{group.epic.priority}</span>
			<span class="progress-badge">{group.completedCount}/{group.totalCount}</span>
			{#if group.activeCount > 0}
				<span class="health-badge active-badge">★{group.activeCount}</span>
			{/if}
			{#if group.blockedCount > 0}
				<span class="health-badge blocked-badge">⛓{group.blockedCount}</span>
			{/if}
		</button>
		<button class="use-id-icon" onclick={handleUseId} type="button" title="Use epic ID: {group.epic.id}">
			<iconify-icon icon="mdi:arrow-right-circle"></iconify-icon>
		</button>
	</div>
	<div class="progress-bar-track">
		<div class="progress-bar-fill" style="width: {progressPercent}%"></div>
	</div>

	{#if sessionId && tmuxTarget && project}
		<div class="batch-run-slot">
			<BatchRunControls {sessionId} {tmuxTarget} {project} epicId={group.epic.id} />
		</div>
	{/if}

	{#if expanded}
		<div class="epic-tasks">
			{#if group.tasks.length === 0}
				<div class="no-tasks">No active tasks</div>
			{:else}
				{#each group.tasks as task (task.id)}
					<IssueItem issue={task} {onSelect} nested />
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.epic-section {
		margin-bottom: 4px;
	}

	.epic-header-row {
		display: flex;
		align-items: center;
	}

	.epic-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 12px;
		border-radius: 8px 0 0 8px;
		border: none;
		background: color-mix(in srgb, var(--epic-color) 8%, transparent);
		text-align: left;
		cursor: pointer;
		flex: 1;
		min-width: 0;
		min-height: 44px;
		color: inherit;
		font-family: inherit;
	}

	.epic-header:hover {
		background: color-mix(in srgb, var(--epic-color) 15%, transparent);
	}

	.priority-badge {
		font-size: 10px;
		font-weight: 700;
		color: white;
		padding: 2px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.use-id-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		min-height: 44px;
		border: none;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		border-radius: 0 8px 8px 0;
		flex-shrink: 0;
		font-size: 16px;
	}

	.use-id-icon:hover {
		background: hsl(var(--accent));
		color: hsl(var(--foreground));
	}

	.chevron {
		font-size: 16px;
		flex-shrink: 0;
	}

	.epic-title {
		font-size: 13px;
		font-weight: 600;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.progress-badge {
		font-size: 11px;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
	}

	.health-badge {
		font-size: 11px;
		font-weight: 600;
		padding: 1px 5px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.active-badge {
		color: #27ae60;
		background: hsl(142 76% 36% / 0.12);
	}

	.blocked-badge {
		color: #e74c3c;
		background: hsl(4 90% 58% / 0.12);
	}

	.progress-bar-track {
		height: 3px;
		background: hsl(var(--accent));
		margin: 0 12px;
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: #27ae60;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.batch-run-slot {
		padding: 4px 12px;
	}

	.epic-tasks {
		padding-left: 4px;
	}

	.no-tasks {
		color: hsl(var(--muted-foreground));
		font-size: 12px;
		font-style: italic;
		padding: 8px 16px;
	}
</style>
