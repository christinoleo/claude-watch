import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession, updateSession } from '$shared/db/index.js';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	try {
		const session = getSession(id);
		if (!session) {
			return json({ error: 'Session not found', id }, { status: 404 });
		}
		return json({
			session,
			timestamp: Date.now()
		});
	} catch {
		return json({ error: 'Error reading session' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = params.id;
	const body = await request.json();

	try {
		const session = getSession(id);
		if (!session) {
			return json({ error: 'Session not found', id }, { status: 404 });
		}

		// Handle cwd relocation
		if (body.cwd) {
			const newCwd = body.cwd;
			if (!existsSync(newCwd)) {
				return json({ error: 'Directory does not exist' }, { status: 400 });
			}
			const stat = statSync(newCwd);
			if (!stat.isDirectory()) {
				return json({ error: 'Path is not a directory' }, { status: 400 });
			}

			// Detect git root for the new cwd
			let gitRoot: string | null = null;
			try {
				gitRoot = execSync('git rev-parse --show-toplevel', {
					cwd: newCwd,
					encoding: 'utf-8',
					stdio: ['pipe', 'pipe', 'pipe']
				}).trim();
			} catch {
				// Not a git repo, that's ok
			}

			updateSession(id, { cwd: newCwd, git_root: gitRoot });
			return json({ ok: true, cwd: newCwd, git_root: gitRoot });
		}

		return json({ error: 'No valid update fields provided' }, { status: 400 });
	} catch (err) {
		return json({ error: 'Error updating session', details: String(err) }, { status: 500 });
	}
};
