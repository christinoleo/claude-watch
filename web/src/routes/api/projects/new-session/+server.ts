import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { upsertSession } from '$shared/db/index.js';

export const POST: RequestHandler = async ({ request }) => {
	const { cwd } = await request.json();
	if (!cwd) {
		return json({ error: 'cwd required' }, { status: 400 });
	}

	// Check if the folder exists
	if (!existsSync(cwd)) {
		return json({ error: 'Folder does not exist' }, { status: 400 });
	}
	const stat = statSync(cwd);
	if (!stat.isDirectory()) {
		return json({ error: 'Path is not a directory' }, { status: 400 });
	}

	try {
		// Create new tmux window and run claude in the specified directory
		const sessionName = 'claude-' + Date.now();
		const tmuxTarget = sessionName + ':1.1';
		execSync(`tmux new-session -d -s "${sessionName}" -c "${cwd}" -- claude --dangerously-skip-permissions`, {
			stdio: 'ignore'
		});

		// Add session immediately so it shows up in UI
		try {
			const id = crypto.randomUUID();
			console.log('[new-session] Creating session:', { id, cwd, tmuxTarget });
			upsertSession({
				id,
				pid: 0,
				cwd,
				tmux_target: tmuxTarget,
				state: 'idle'
			});
			console.log('[new-session] Session created successfully');
		} catch (err) {
			console.error('[new-session] Session creation failed:', err);
		}

		return json({ ok: true, session: sessionName });
	} catch {
		return json({ error: 'Failed to create session' }, { status: 500 });
	}
};
