/**
 * Terminal output block types for visual differentiation
 */
export type BlockType =
	| 'user-prompt' // Lines starting with ❯
	| 'claude-response' // Lines starting with ●
	| 'tool-call' // Tool invocations like "● Bash(ls)"
	| 'tool-result' // Lines starting with ⎿
	| 'separator' // Lines starting with ─────
	| 'status' // Status bar content (Esc to interrupt, etc.)
	| 'spinner' // Active spinner animation
	| 'plain'; // Unclassified content

/**
 * A parsed block of terminal output with type classification
 */
export interface ParsedBlock {
	/** Unique identifier for Svelte keyed each */
	id: number;
	/** The type of content this block represents */
	type: BlockType;
	/** The raw text content of this block */
	content: string;
	/** Optional metadata extracted from the content */
	metadata?: {
		/** Tool name for tool-call blocks */
		toolName?: string;
		/** Whether this block appears complete */
		isComplete?: boolean;
	};
}
