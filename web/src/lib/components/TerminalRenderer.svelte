<script lang="ts">
	import { AnsiUp } from 'ansi_up';

	interface Props {
		output: string;
		class?: string;
	}

	const { output, class: className = '' }: Props = $props();

	const ansi = new AnsiUp();
	ansi.use_classes = true;

	const html = $derived(ansi.ansi_to_html(output));
</script>

<pre class="terminal-renderer {className}">{@html html}</pre>

<style>
	.terminal-renderer {
		margin: 0;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		font-size: 13px;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		background: #000;
		color: #fff;
	}

	/* ansi_up class-based colors */
	.terminal-renderer :global(.ansi-black-fg) { color: #555; }
	.terminal-renderer :global(.ansi-red-fg) { color: #f87171; }
	.terminal-renderer :global(.ansi-green-fg) { color: #4ade80; }
	.terminal-renderer :global(.ansi-yellow-fg) { color: #fbbf24; }
	.terminal-renderer :global(.ansi-blue-fg) { color: #60a5fa; }
	.terminal-renderer :global(.ansi-magenta-fg) { color: #c084fc; }
	.terminal-renderer :global(.ansi-cyan-fg) { color: #22d3ee; }
	.terminal-renderer :global(.ansi-white-fg) { color: #e5e7eb; }

	.terminal-renderer :global(.ansi-bright-black-fg) { color: #6b7280; }
	.terminal-renderer :global(.ansi-bright-red-fg) { color: #fca5a5; }
	.terminal-renderer :global(.ansi-bright-green-fg) { color: #86efac; }
	.terminal-renderer :global(.ansi-bright-yellow-fg) { color: #fde68a; }
	.terminal-renderer :global(.ansi-bright-blue-fg) { color: #93c5fd; }
	.terminal-renderer :global(.ansi-bright-magenta-fg) { color: #d8b4fe; }
	.terminal-renderer :global(.ansi-bright-cyan-fg) { color: #67e8f9; }
	.terminal-renderer :global(.ansi-bright-white-fg) { color: #fff; }

	.terminal-renderer :global(.ansi-black-bg) { background-color: #000; }
	.terminal-renderer :global(.ansi-red-bg) { background-color: #b91c1c; }
	.terminal-renderer :global(.ansi-green-bg) { background-color: #15803d; }
	.terminal-renderer :global(.ansi-yellow-bg) { background-color: #a16207; }
	.terminal-renderer :global(.ansi-blue-bg) { background-color: #1d4ed8; }
	.terminal-renderer :global(.ansi-magenta-bg) { background-color: #7e22ce; }
	.terminal-renderer :global(.ansi-cyan-bg) { background-color: #0e7490; }
	.terminal-renderer :global(.ansi-white-bg) { background-color: #e5e7eb; }

	.terminal-renderer :global(.ansi-bold) { font-weight: 700; }
	.terminal-renderer :global(.ansi-dim) { opacity: 0.7; }
	.terminal-renderer :global(.ansi-italic) { font-style: italic; }
	.terminal-renderer :global(.ansi-underline) { text-decoration: underline; }
	.terminal-renderer :global(.ansi-strikethrough) { text-decoration: line-through; }
</style>
