<script lang="ts">
	import type { ParsedBlock } from '$lib/types/terminal';

	interface Props {
		blocks: ParsedBlock[];
		class?: string;
	}

	const { blocks, class: className = '' }: Props = $props();

	// Type-specific styling classes
	const typeStyles: Record<string, string> = {
		'user-prompt': 'terminal-user-prompt',
		'claude-response': 'terminal-claude-response',
		'tool-call': 'terminal-tool-call',
		'tool-result': 'terminal-tool-result',
		separator: 'terminal-separator',
		status: 'terminal-status',
		spinner: 'terminal-spinner',
		plain: 'terminal-plain'
	};

	// Tool-specific colors
	const toolColors: Record<string, string> = {
		// File operations
		'Read': 'tool-read',
		'Write': 'tool-write',
		'Edit': 'tool-edit',
		'Update': 'tool-edit',
		'NotebookEdit': 'tool-edit',
		'Glob': 'tool-search',
		'Grep': 'tool-search',
		'Search': 'tool-search',
		// Execution
		'Bash': 'tool-bash',
		'Task': 'tool-task',
		// Web operations
		'WebFetch': 'tool-web',
		'WebSearch': 'tool-web',
		// Todo
		'TodoWrite': 'tool-todo',
		// Browser/MCP
		'chrome-devtools': 'tool-browser',
		'mcp': 'tool-browser',
	};

	function getToolClass(toolName: string | undefined): string {
		if (!toolName) return 'tool-default';
		// Check exact match first
		if (toolColors[toolName]) return toolColors[toolName];
		// Check if tool name contains a known prefix
		for (const [key, value] of Object.entries(toolColors)) {
			if (toolName.toLowerCase().includes(key.toLowerCase())) return value;
		}
		return 'tool-default';
	}

	// Process content for diff highlighting
	function processDiffContent(content: string): string {
		return content
			.split('\n')
			.map(line => {
				// Diff lines: number followed by + or -
				if (/^\s*\d+\s*\+/.test(line)) {
					return `<span class="diff-add">${escapeHtml(line)}</span>`;
				}
				if (/^\s*\d+\s*-/.test(line)) {
					return `<span class="diff-remove">${escapeHtml(line)}</span>`;
				}
				return escapeHtml(line);
			})
			.join('\n');
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
</script>

<pre class="terminal-renderer {className}">{#each blocks as block (block.id)}<span class="terminal-block {typeStyles[block.type] || 'terminal-plain'} {block.type === 'tool-call' ? getToolClass(block.metadata?.toolName) : ''}">{#if block.type === 'tool-call' && block.metadata?.toolName}<span class="tool-badge {getToolClass(block.metadata.toolName)}">{block.metadata.toolName}</span>{/if}{#if block.type === 'tool-result'}{@html processDiffContent(block.content)}{:else}{block.content}{/if}</span>
{/each}</pre>

<style>
	/* Tool color definitions - single source of truth */
	.terminal-renderer {
		--tool-read: #60a5fa;      /* blue */
		--tool-write: #c084fc;     /* purple */
		--tool-edit: #fbbf24;      /* amber/yellow */
		--tool-search: #f472b6;    /* pink */
		--tool-bash: #22d3ee;      /* cyan */
		--tool-task: #a78bfa;      /* violet */
		--tool-web: #fb923c;       /* orange-400 */
		--tool-todo: #a3e635;      /* lime-400 */
		--tool-browser: #f97316;   /* orange-500 */
		--tool-default: #4ade80;   /* green */

		margin: 0;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		font-size: 13px;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		background: #000;
		color: #fff;
	}

	/* User prompt: blue */
	.terminal-user-prompt {
		color: var(--tool-read);
		font-weight: 500;
	}

	/* Claude response: white (normal conversation) */
	.terminal-claude-response {
		color: #fff;
	}

	/* Tool call: default green */
	.terminal-tool-call {
		color: var(--tool-default);
	}

	.tool-badge {
		font-size: 11px;
		font-weight: 600;
		color: #000;
		padding: 0 4px;
		border-radius: 3px;
		margin-right: 4px;
		background: var(--tool-default);
	}

	/* Tool-specific colors - badge backgrounds and text use same variable */
	.tool-badge.tool-read { background: var(--tool-read); }
	.tool-badge.tool-write { background: var(--tool-write); }
	.tool-badge.tool-edit { background: var(--tool-edit); }
	.tool-badge.tool-search { background: var(--tool-search); }
	.tool-badge.tool-bash { background: var(--tool-bash); }
	.tool-badge.tool-task { background: var(--tool-task); }
	.tool-badge.tool-web { background: var(--tool-web); }
	.tool-badge.tool-todo { background: var(--tool-todo); }
	.tool-badge.tool-browser { background: var(--tool-browser); }
	.tool-badge.tool-default { background: var(--tool-default); }

	.terminal-tool-call.tool-read { color: var(--tool-read); }
	.terminal-tool-call.tool-write { color: var(--tool-write); }
	.terminal-tool-call.tool-edit { color: var(--tool-edit); }
	.terminal-tool-call.tool-search { color: var(--tool-search); }
	.terminal-tool-call.tool-bash { color: var(--tool-bash); }
	.terminal-tool-call.tool-task { color: var(--tool-task); }
	.terminal-tool-call.tool-web { color: var(--tool-web); }
	.terminal-tool-call.tool-todo { color: var(--tool-todo); }
	.terminal-tool-call.tool-browser { color: var(--tool-browser); }
	.terminal-tool-call.tool-default { color: var(--tool-default); }

	/* Diff highlighting */
	.diff-add { color: #4ade80; } /* green for additions */
	.diff-remove { color: #f87171; } /* red for removals */

	/* Tool result: gray */
	.terminal-tool-result {
		color: #d1d5db; /* gray-300 */
	}

	/* Separator: dimmed */
	.terminal-separator {
		color: #4b5563; /* gray-600 */
	}

	/* Status: dimmed */
	.terminal-status {
		color: #6b7280; /* gray-500 */
	}

	/* Spinner: cyan */
	.terminal-spinner {
		color: #22d3ee; /* cyan-400 */
	}

	/* Plain: default gray-200 */
	.terminal-plain {
		color: #e5e7eb; /* gray-200 */
	}
</style>
