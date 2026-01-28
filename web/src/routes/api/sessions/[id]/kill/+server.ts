import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execSync } from 'child_process';
import { deleteSession } from '$shared/db/index.js';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = decodeURIComponent(params.id);
	const body = await request.json().catch(() => ({}));
	const { pid, tmux_target } = body;

	try {
		if (tmux_target) {
			// Kill tmux session
			const session = tmux_target.split(':')[0];
			execSync(`tmux kill-session -t "${session}" 2>/dev/null || true`, { stdio: 'ignore' });
		} else if (pid && pid > 0) {
			// Kill process directly for non-tmux sessions
			execSync(`kill ${pid} 2>/dev/null || true`, { stdio: 'ignore' });
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
