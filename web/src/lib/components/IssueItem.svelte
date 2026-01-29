<script lang="ts">
	import type { BeadsIssue } from '$lib/stores/beads.svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		issue: BeadsIssue;
		onSelect?: (issue: BeadsIssue) => void;
	}

	let { issue, onSelect }: Props = $props();

	let expanded = $state(false);

	// Get status color
	function statusColor(status: BeadsIssue['status']): string {
		switch (status) {
			case 'in_progress':
				return '#27ae60'; // green
			case 'open':
				return '#f39c12'; // yellow
			case 'blocked':
				return '#e74c3c'; // red
			case 'closed':
			case 'deferred':
			default:
				return '#888888'; // gray
		}
	}

	// Get priority color
	function priorityColor(priority: number): string {
		switch (priority) {
			case 0:
				return '#e74c3c'; // red - critical
			case 1:
				return '#e67e22'; // orange - high
			case 2:
				return '#f39c12'; // yellow - medium
			case 3:
				return '#3498db'; // blue - low
			case 4:
			default:
				return '#888888'; // gray - backlog
		}
	}

	// Format status for display
	function formatStatus(status: BeadsIssue['status']): string {
		return status.replace('_', ' ');
	}

	// Format date for display
	function formatDate(dateStr?: string): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		return date.toLocaleDateString();
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	function handleUseId(e: Event) {
		e.stopPropagation();
		onSelect?.(issue);
	}
</script>

<div class="issue-wrapper" class:expanded>
	<button class="issue-item" onclick={toggleExpanded} type="button">
		<span class="status-dot" style="background: {statusColor(issue.status)}"></span>
		<span class="issue-title">{issue.title}</span>
		<span class="priority-badge" style="background: {priorityColor(issue.priority)}">P{issue.priority}</span>
		<iconify-icon
			icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
			class="chevron"
		></iconify-icon>
	</button>

	{#if expanded}
		<div class="issue-details">
			<!-- Full title (not truncated) -->
			<div class="full-title">{issue.title}</div>

			<!-- Description if available -->
			{#if issue.description}
				<div class="description">{issue.description}</div>
			{/if}

			<!-- Mobile: minimal info -->
			<div class="details-mobile">
				<div class="detail-row">
					<span class="detail-label">Status</span>
					<span class="detail-value status-value" style="color: {statusColor(issue.status)}">{formatStatus(issue.status)}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Type</span>
					<span class="detail-value">{issue.issue_type}</span>
				</div>
			</div>

			<!-- Desktop: full details -->
			<div class="details-desktop">
				<div class="detail-row">
					<span class="detail-label">Status</span>
					<span class="detail-value status-value" style="color: {statusColor(issue.status)}">{formatStatus(issue.status)}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Type</span>
					<span class="detail-value">{issue.issue_type}</span>
				</div>
				{#if issue.assignee}
					<div class="detail-row">
						<span class="detail-label">Assignee</span>
						<span class="detail-value">{issue.assignee}</span>
					</div>
				{/if}
				{#if issue.owner}
					<div class="detail-row">
						<span class="detail-label">Owner</span>
						<span class="detail-value">{issue.owner}</span>
					</div>
				{/if}
				{#if issue.dependencies && issue.dependencies.length > 0}
					<div class="detail-row">
						<span class="detail-label">Dependencies</span>
						<span class="detail-value">{issue.dependencies.map(d => d.depends_on_id).join(', ')}</span>
					</div>
				{/if}
				<div class="detail-row">
					<span class="detail-label">Created</span>
					<span class="detail-value">{formatDate(issue.created_at)}</span>
				</div>
				{#if issue.updated_at}
					<div class="detail-row">
						<span class="detail-label">Updated</span>
						<span class="detail-value">{formatDate(issue.updated_at)}</span>
					</div>
				{/if}
				<div class="detail-row">
					<span class="detail-label">ID</span>
					<span class="detail-value id-value">{issue.id}</span>
				</div>
			</div>

			<Button variant="outline" size="sm" onclick={handleUseId} class="use-id-btn">
				<iconify-icon icon="mdi:arrow-right-circle"></iconify-icon>
				Use ID
			</Button>
		</div>
	{/if}
</div>

<style>
	.issue-wrapper {
		border-radius: 8px;
		margin-bottom: 4px;
	}

	.issue-wrapper.expanded {
		background: hsl(var(--accent) / 0.5);
	}

	.issue-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 8px;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		width: 100%;
		min-height: 44px;
		color: inherit;
		font-family: inherit;
	}

	.issue-item:hover {
		background: hsl(var(--accent));
	}

	.issue-item:active {
		background: hsl(var(--accent) / 0.8);
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.priority-badge {
		font-size: 10px;
		font-weight: 700;
		color: white;
		padding: 2px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.issue-title {
		font-size: 13px;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		font-size: 16px;
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
	}

	.issue-details {
		padding: 0 12px 12px;
	}

	.full-title {
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 8px;
		line-height: 1.4;
	}

	.description {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		margin-bottom: 12px;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 0;
		font-size: 12px;
	}

	.detail-label {
		color: hsl(var(--muted-foreground));
	}

	.detail-value {
		font-weight: 500;
		text-align: right;
	}

	.status-value {
		text-transform: capitalize;
	}

	.id-value {
		font-family: monospace;
		font-size: 11px;
	}

	.issue-details :global(.use-id-btn) {
		width: 100%;
		margin-top: 8px;
	}

	/* Mobile: show minimal details */
	.details-desktop {
		display: none;
	}

	.details-mobile {
		display: block;
	}

	/* Desktop: show full details */
	@media (min-width: 768px) {
		.details-desktop {
			display: block;
		}

		.details-mobile {
			display: none;
		}
	}
</style>
