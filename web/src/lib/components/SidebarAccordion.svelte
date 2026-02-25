<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { Snippet } from 'svelte';

	interface Props {
		icon: string;
		title: string;
		count?: number | null;
		defaultExpanded?: boolean;
		lazy?: boolean;
		onExpandChange?: (expanded: boolean) => void;
		children: Snippet;
	}

	let {
		icon,
		title,
		count = null,
		defaultExpanded = false,
		lazy = false,
		onExpandChange,
		children
	}: Props = $props();

	let expanded = $state(defaultExpanded ?? false);
	let hasBeenExpanded = $state(defaultExpanded ?? false);

	function toggle() {
		expanded = !expanded;
		if (expanded && !hasBeenExpanded) {
			hasBeenExpanded = true;
		}
		onExpandChange?.(expanded);
	}

	const shouldRender = $derived(lazy ? hasBeenExpanded : true);
</script>

<div class="accordion">
	<button class="accordion-header" onclick={toggle} type="button">
		<iconify-icon {icon}></iconify-icon>
		<span class="accordion-title">{title}</span>
		{#if count != null}
			<Badge variant="outline" class="ml-auto accordion-count">{count}</Badge>
		{/if}
		<iconify-icon
			icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
			class="chevron"
		></iconify-icon>
	</button>

	{#if expanded && shouldRender}
		<div class="accordion-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.accordion {
		border-top: 1px solid hsl(var(--border));
	}

	.accordion-header {
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

	.accordion-header:hover {
		background: hsl(var(--accent) / 0.5);
	}

	.accordion-header :global(.accordion-count) {
		font-size: 11px;
		padding: 2px 6px;
	}

	.accordion-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		font-size: 18px;
		color: hsl(var(--muted-foreground));
	}

	.accordion-content {
		padding: 0 12px 12px;
	}
</style>
