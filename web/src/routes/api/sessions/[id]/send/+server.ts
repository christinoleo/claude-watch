import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execSync } from 'child_process';

export const POST: RequestHandler = async ({ params, request }) => {
	const target = decodeURIComponent(params.id);
	const body = await request.json();
	const keys = body.keys || 'Escape';
	const text = body.text; // For literal text input

	try {
		if (text) {
			// Send literal text then Enter
			execSync(`tmux send-keys -t "${target}" -l ${JSON.stringify(text)}`, { stdio: 'ignore' });
			execSync(`tmux send-keys -t "${target}" Enter`, { stdio: 'ignore' });
		} else {
			execSync(`tmux send-keys -t "${target}" ${keys}`, { stdio: 'ignore' });
		}
		return json({ ok: true });
	} catch {
		return json({ error: 'Failed to send keys' }, { status: 500 });
	}
};
