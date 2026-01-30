import type { BlockType, ParsedBlock } from '$lib/types/terminal';

/**
 * Regex patterns for Claude Code visual elements
 */
const PATTERNS = {
	// User prompt starts with ❯ (Unicode chevron only - ASCII > is used for selection indicators)
	userPrompt: /^❯\s/,
	// Claude response starts with ● (filled circle) followed by actual text
	claudeResponse: /^●\s+\S/,
	// Working indicator: just ● alone or with whitespace (no content after)
	workingIndicator: /^●\s*$/,
	// Tool result starts with ⎿ (with optional leading whitespace)
	toolResult: /^(\s*)⎿/,
	// Indented content (2+ spaces at start) - continues tool results
	indentedContent: /^(\s{2,}|\t)/,
	// Separator is 5+ dashes
	separator: /^─{5,}/,
	// Tool call: ● ToolName(...) or ● tool-name (...)
	toolCall: /^●\s+([\w-]+)\s*\(/,
	// MCP tool call: ● mcp-server - tool_name (MCP)
	mcpToolCall: /^●\s+([\w-]+)\s+-\s+([\w_]+)\s+\(MCP\)/,
	// Braille spinner characters
	spinner: /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠐⠂⠄]/,
	// Status hints
	statusHint: /(Esc to interrupt|ctrl\+c to interrupt|Esc to cancel|to cycle\))/i,
	// Progress bar or status line at bottom
	progressBar: /^\s*[\w-]+\s+\[.*\]\s+\w+@/
};

/**
 * Classify a single line of terminal output
 */
function classifyLine(line: string, previousType: BlockType | null): BlockType {
	// Check for separator first (most specific)
	if (PATTERNS.separator.test(line)) return 'separator';

	// Check for MCP tool call
	if (PATTERNS.mcpToolCall.test(line)) return 'tool-call';

	// Check for regular tool call
	if (PATTERNS.toolCall.test(line)) return 'tool-call';

	// Check for working indicator (just ● with no content) - treat as spinner
	if (PATTERNS.workingIndicator.test(line)) return 'spinner';

	// Check for user prompt
	if (PATTERNS.userPrompt.test(line)) return 'user-prompt';

	// Check for Claude response (but not tool call)
	if (PATTERNS.claudeResponse.test(line)) return 'claude-response';

	// Check for tool result
	if (PATTERNS.toolResult.test(line)) return 'tool-result';

	// Indented content continues tool calls (multi-line arguments)
	if (previousType === 'tool-call' && PATTERNS.indentedContent.test(line)) {
		return 'tool-call';
	}

	// Indented content continues tool results
	if (previousType === 'tool-result' && PATTERNS.indentedContent.test(line)) {
		return 'tool-result';
	}

	// Check for status/progress indicators
	if (PATTERNS.statusHint.test(line) || PATTERNS.progressBar.test(line)) return 'status';

	// Check for active spinner
	if (PATTERNS.spinner.test(line) && line.length < 100) return 'spinner';

	return 'plain';
}

/**
 * Extract tool name from a tool call line
 */
function extractToolName(line: string): string | undefined {
	// Try MCP tool format first
	const mcpMatch = line.match(PATTERNS.mcpToolCall);
	if (mcpMatch) {
		return `${mcpMatch[1]}:${mcpMatch[2]}`;
	}

	// Try regular tool format
	const match = line.match(PATTERNS.toolCall);
	if (match) {
		return match[1];
	}

	return undefined;
}

/**
 * Check if a line is a genuine new tool call (not just continuation)
 */
function isNewToolCall(line: string): boolean {
	return PATTERNS.toolCall.test(line) || PATTERNS.mcpToolCall.test(line);
}

/**
 * Transition table: defines when to CONTINUE (false) vs BREAK (true) blocks.
 * true = start new block, false = continue current block, undefined = use default (break on type change)
 *
 * Format: TRANSITIONS[currentType][newType] = shouldBreak
 */
const TRANSITIONS: Record<BlockType, Partial<Record<BlockType, boolean>>> = {
	'user-prompt': {
		'plain': false,      // Multi-line user input continues
		'spinner': false,    // Spinners during input don't break
	},
	'claude-response': {
		'plain': false,      // Response text continues
		'spinner': false,    // Spinners during response don't break
	},
	'tool-call': {
		'tool-call': false,  // Continuation lines (handled specially for new tool calls)
		'tool-result': false, // Results follow tool calls
		'spinner': false,    // Spinners during execution don't break
	},
	'tool-result': {
		'tool-result': false, // Multiple result lines continue
		'spinner': false,    // Spinners during results don't break
	},
	'separator': {
		// Separators always break - no continues
	},
	'status': {
		'status': false,     // Status lines group together
	},
	'spinner': {
		'spinner': false,    // Multiple spinner frames group together
	},
	'plain': {
		'plain': false,      // Plain content groups together
	},
};

/**
 * Determine if we should start a new block based on current and new type.
 * Uses explicit transition table for clarity and maintainability.
 */
function shouldStartNewBlock(current: ParsedBlock | null, newType: BlockType, line: string): boolean {
	if (!current) return true;

	// Separators and user prompts always start new blocks
	if (newType === 'separator' || newType === 'user-prompt') {
		return true;
	}

	// Special case: new tool calls always start new blocks, but continuations don't
	if (newType === 'tool-call' && isNewToolCall(line)) {
		return true;
	}

	// Look up transition in table
	const transition = TRANSITIONS[current.type]?.[newType];

	// If explicitly defined, use that
	if (transition !== undefined) {
		return transition;
	}

	// Default: break on type change
	return current.type !== newType;
}

/**
 * Parse terminal output into typed blocks
 */
export function parseTerminalOutput(output: string): ParsedBlock[] {
	if (!output || output.trim() === '') {
		return [];
	}

	const lines = output.split('\n');
	const blocks: ParsedBlock[] = [];
	let currentBlock: ParsedBlock | null = null;
	let blockIdCounter = 0;

	for (const line of lines) {
		// Skip empty lines - they just add vertical space
		if (line.trim() === '') {
			continue;
		}

		const previousType = currentBlock?.type ?? null;
		const blockType = classifyLine(line, previousType);

		if (shouldStartNewBlock(currentBlock, blockType, line)) {
			// Save current block if exists
			if (currentBlock && currentBlock.content.trim()) {
				blocks.push(currentBlock);
			}

			// Create new block
			currentBlock = {
				id: ++blockIdCounter,
				type: blockType,
				content: line
			};

			// Extract metadata for tool calls
			if (blockType === 'tool-call') {
				const toolName = extractToolName(line);
				if (toolName) {
					currentBlock.metadata = { toolName };
				}
			}
		} else if (currentBlock) {
			// Append to current block
			currentBlock.content += '\n' + line;
		}
	}

	// Don't forget the last block
	if (currentBlock && currentBlock.content.trim()) {
		blocks.push(currentBlock);
	}

	return blocks;
}

/**
 * Get statistics about parsed blocks
 */
export function getBlockStats(blocks: ParsedBlock[]): {
	userPrompts: number;
	claudeResponses: number;
	toolCalls: number;
	hasActiveSpinner: boolean;
} {
	return {
		userPrompts: blocks.filter((b) => b.type === 'user-prompt').length,
		claudeResponses: blocks.filter((b) => b.type === 'claude-response').length,
		toolCalls: blocks.filter((b) => b.type === 'tool-call').length,
		hasActiveSpinner: blocks.some((b) => b.type === 'spinner')
	};
}
