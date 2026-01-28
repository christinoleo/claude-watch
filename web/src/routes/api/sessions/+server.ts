import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSessions, updateSession } from '$shared/db/index.js';
import { checkForInterruption, getPaneTitle } from '$shared/tmux/pane.js';

// Sync session state by detecting interruptions (user pressed Escape)
function syncSessionStates(): void {
	const sessions = getAllSessions().filter((s) => s.tmux_target);

	for (const session of sessions) {
		if (!session.tmux_target) continue;

		const update = checkForInterruption(session.tmux_target);
		if (update && session.state !== 'idle') {
			updateSession(session.id, update);
		}
	}
}

// Deduplicate sessions by tmux_target, keeping only the most recent one
function deduplicateByTmuxTarget<T extends { tmux_target: string | null; last_update: number }>(
	sessions: T[]
): T[] {
	const byTarget = new Map<string, T>();
	const noTarget: T[] = [];

	for (const session of sessions) {
		if (!session.tmux_target) {
			noTarget.push(session);
			continue;
		}

		const existing = byTarget.get(session.tmux_target);
		if (!existing || session.last_update > existing.last_update) {
			byTarget.set(session.tmux_target, session);
		}
	}

	return [...byTarget.values(), ...noTarget];
}

export const GET: RequestHandler = async () => {
	try {
		syncSessionStates();
		const sessions = getAllSessions();
		// Enrich sessions with pane titles from tmux
		const enrichedSessions = sessions.map((s) => ({
			...s,
			pane_title: s.tmux_target ? getPaneTitle(s.tmux_target) : null
		}));
		// Deduplicate by tmux_target to avoid showing same pane multiple times
		const dedupedSessions = deduplicateByTmuxTarget(enrichedSessions);

		return json({
			sessions: dedupedSessions,
			count: dedupedSessions.length,
			timestamp: Date.now()
		});
	} catch {
		return json({ error: 'Error reading sessions' }, { status: 500 });
	}
};
