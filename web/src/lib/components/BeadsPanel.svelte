<script lang="ts">
	import { beadsStore, type BeadsFilter, type BeadsIssue } from '$lib/stores/beads.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import IssueItem from './IssueItem.svelte';

	interface Props {
		project: string | null;
		onSelect?: (issue: BeadsIssue) => void;
	}

	let { project, onSelect }: Props = $props();

	let expanded = $state(true);

	// Update beads store when project changes
	$effect(() => {
		beadsStore.setProject(project);
	});

	function toggleExpanded() {
		expanded = !expanded;
	}

	function setFilter(filter: BeadsFilter) {
		beadsStore.setFilter(filter);
	}

	function handleIssueSelect(issue: BeadsIssue) {
		onSelect?.(issue);
	}

	const filters: { label: string; value: BeadsFilter }[] = [
		{ label: 'Ready', value: 'ready' },
		{ label: 'Open', value: 'open' },
		{ label: 'All', value: 'all' }
	];
</script>

<div class="beads-panel">
	<button class="panel-header" onclick={toggleExpanded} type="button">
		<iconify-icon icon="mdi:checkbox-multiple-marked-outline"></iconify-icon>
		<span>Issues</span>
		<Badge variant="outline" class="ml-auto issue-count">{beadsStore.issueCount}</Badge>
		<iconify-icon
			icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
			class="chevron"
		></iconify-icon>
	</button>

	{#if expanded}
		<div class="panel-content">
			<div class="filter-buttons">
				{#each filters as f (f.value)}
					<Button
						variant={beadsStore.filter === f.value ? 'default' : 'ghost'}
						size="sm"
						onclick={() => setFilter(f.value)}
						class="filter-btn"
					>
						{f.label}
					</Button>
				{/each}
			</div>

			<div>
				{#if beadsStore.loading}
					<div class="loading">Loading issues...</div>
				{:else if beadsStore.error}
					<div class="error">{beadsStore.error}</div>
				{:else if beadsStore.filteredIssues.length === 0}
					<div class="empty">No issues</div>
				{:else}
					{#each beadsStore.filteredIssues as issue (issue.id)}
						<IssueItem {issue} onSelect={handleIssueSelect} />
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.beads-panel {
		border-top: 1px solid hsl(var(--border));
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 12px;
		border: none;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}

	.panel-header:hover {
		background: hsl(var(--accent) / 0.5);
	}

	.panel-header :global(.issue-count) {
		font-size: 11px;
		padding: 2px 6px;
	}

	.chevron {
		font-size: 18px;
		color: hsl(var(--muted-foreground));
	}

	.panel-content {
		padding: 0 12px 12px;
	}

	.filter-buttons {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
	}

	.filter-buttons :global(.filter-btn) {
		flex: 1;
		height: 32px;
		font-size: 12px;
	}

	.loading,
	.error,
	.empty {
		color: hsl(var(--muted-foreground));
		text-align: center;
		padding: 20px;
		font-size: 13px;
	}

	.error {
		color: hsl(var(--destructive));
	}
</style>
