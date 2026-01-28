import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execFileSync } from 'child_process';
import { deleteSession } from '$shared/db/index.js';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = decodeURIComponent(params.id);
	const body = await request.json().catch(() => ({}));
	const { pid, tmux_target } = body;

	try {
		if (tmux_target && typeof tmux_target === 'string') {
			// Kill tmux session
			const session = tmux_target.split(':')[0];
			try {
				execFileSync('tmux', ['kill-session', '-t', session], { stdio: 'ignore' });
			} catch {
				// Session may not exist - ignore
			}
		} else if (typeof pid === 'number' && pid > 0 && Number.isInteger(pid)) {
			// Kill process directly for non-tmux sessions
			try {
				execFileSync('kill', [String(pid)], { stdio: 'ignore' });
			} catch {
				// Process may not exist - ignore
			}
		}

		// Remove session file
		try {
			deleteSession(id);
		} catch {
			// Cleanup is best-effort
		}
		return json({ ok: true });
	} catch {
		// Even if kill fails, clean up session
		try {
			deleteSession(id);
		} catch {
			// Ignore
		}
		return json({ ok: true });
	}
};
