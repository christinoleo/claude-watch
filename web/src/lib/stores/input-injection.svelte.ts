/**
 * Input injection store for passing issue IDs from sidebar to session input.
 *
 * Flow:
 * 1. User taps issue in BeadsPanel
 * 2. BeadsPanel sets pendingIssueId
 * 3. Session page watches pendingIssueId
 * 4. Session page inserts ID into textarea and clears pendingIssueId
 */

class InputInjectionStore {
	/** The issue ID waiting to be inserted */
	pendingIssueId = $state<string | null>(null);

	/**
	 * Set an issue ID to be injected into the session input
	 */
	inject(issueId: string): void {
		this.pendingIssueId = issueId;
	}

	/**
	 * Clear the pending injection (called after insertion)
	 */
	clear(): void {
		this.pendingIssueId = null;
	}

	/**
	 * Consume the pending injection (get and clear in one step)
	 */
	consume(): string | null {
		const id = this.pendingIssueId;
		this.pendingIssueId = null;
		return id;
	}
}

export const inputInjection = new InputInjectionStore();
